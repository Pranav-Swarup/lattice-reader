import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PdfViewer, { clampZoom, scrollToRect } from './components/PdfViewer'
import ChatPanel from './components/ChatPanel'
import Settings from './components/Settings'
import Rail from './components/Rail'
import RangeBar from './components/RangeBar'
import { PROVIDERS } from './lib/llm'
import { BASE_SYSTEM, buildUserTurn, MODES } from './lib/modes'
import * as store from './lib/store'

export default function App() {
  const [settings, setSettings] = useState(store.loadSettings)
  const [usage, setUsage] = useState(store.loadUsage)
  const [library, setLibrary] = useState(store.loadLibrary)

  // Papers live in memory (the File can't be persisted); sessions live on disk.
  const filesRef = useRef(new Map()) // id -> File
  const [activeId, setActiveId] = useState(null)
  const [doc, setDoc] = useState(null)      // { numPages, pages[] }
  const [pending, setPending] = useState(null) // File awaiting fingerprint

  const [range, setRange] = useState([1, 1])
  const [chats, setChats] = useState([])
  const [annotations, setAnnotations] = useState([])
  const [threadId, setThreadId] = useState(null)

  const [zoom, setZoom] = useState(1.35)
  const [focus, setFocus] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [liveHighlight, setLiveHighlight] = useState(null)
  const [dragging, setDragging] = useState(false)

  const fileInput = useRef(null)
  const chatsRef = useRef(chats)
  useEffect(() => { chatsRef.current = chats }, [chats])

  useEffect(() => store.saveSettings(settings), [settings])
  useEffect(() => store.saveUsage(usage), [usage])
  useEffect(() => store.saveLibrary(library), [library])
  useEffect(() => {
    if (activeId) store.saveDoc(activeId, { chats, annotations, range })
  }, [activeId, chats, annotations, range])

  const locked = chats.length > 0

  // --- open a file -> fingerprint -> restore or create its session ---
  const onDocLoaded = useCallback(async (d) => {
    setDoc(d)
    const file = pending
    if (!file) return // only fires for a freshly-opened file
    const id = await store.fingerprint(file, d.pages[0] || '')
    filesRef.current.set(id, file)
    setPending(null)

    setLibrary((lib) => {
      if (lib.some((p) => p.id === id)) return lib
      return [...lib, { id, n: lib.length + 1, name: file.name, addedAt: Date.now() }]
    })

    const saved = store.loadDoc(id)
    setActiveId(id)
    setChats(saved.chats)
    setAnnotations(saved.annotations)
    setRange(saved.range || [1, d.numPages])
    setThreadId(null)
    setError('')
  }, [pending])

  const openFile = (f) => {
    if (!f || f.type !== 'application/pdf') return
    setDoc(null); setThreadId(null); setError(''); setPending(f)
  }

  // Switching papers is a full session swap.
  const pickPaper = (p) => {
    if (p.id === activeId) return
    const f = filesRef.current.get(p.id)
    if (!f) {
      // Session survived a reload but the File didn't. Ask for it back.
      alert(`"${p.name}" isn't loaded in this tab. Pick the file again — your threads are still saved.`)
      fileInput.current?.click()
      return
    }
    setDoc(null); setThreadId(null); setError(''); setPending(f)
  }

  // --- context text, sliced to the chosen page range ---
  const contextText = useMemo(() => {
    if (!doc) return ''
    return doc.pages
      .slice(range[0] - 1, range[1])
      .map((t, i) => `\n--- page ${range[0] + i} ---\n${t}`)
      .join('\n')
  }, [doc, range])

  const changeRange = (next) => {
    if (locked) {
      const ok = confirm(
        'Changing the context range will discard every open thread for this paper. ' +
        'Annotations are kept. Continue?'
      )
      if (!ok) return
      setChats([]); setThreadId(null)
    }
    setRange(next)
  }

  // --- LLM ---
  const callLLM = useCallback(async (messages) => {
    const prov = PROVIDERS[settings.provider]
    const key = settings.keys[settings.provider]
    if (settings.provider !== 'ollama' && !key) throw new Error('Add an API key in Settings first.')
    const r = await prov.send({
      apiKey: key,
      model: settings.model,
      system: BASE_SYSTEM(contextText, range),
      messages,
      baseUrl: settings.ollamaUrl,
    })
    setUsage((u) => ({
      calls: u.calls + 1,
      inputTokens: u.inputTokens + r.usage.inputTokens,
      outputTokens: u.outputTokens + r.usage.outputTokens,
      cacheReadTokens: u.cacheReadTokens + r.usage.cacheReadTokens,
      cacheWriteTokens: u.cacheWriteTokens + r.usage.cacheWriteTokens,
    }))
    return r.text
  }, [settings, contextText, range])

  const runTurn = useCallback(async (id, userMsg, display) => {
    setLiveHighlight(null) // highlight is ephemeral: gone once the prompt is sent
    setBusy(true); setError('')
    try {
      const chat = chatsRef.current.find((c) => c.id === id)
      const history = chat.messages.map(({ role, content }) => ({ role, content }))
      setChats((cs) => cs.map((c) => c.id === id
        ? { ...c, messages: [...c.messages, { role: 'user', content: userMsg, display }] } : c))
      const text = await callLLM([...history, { role: 'user', content: userMsg }])
      setChats((cs) => cs.map((c) => c.id === id
        ? { ...c, messages: [...c.messages, { role: 'assistant', content: text }] } : c))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }, [callLLM])

  // --- G / A ---
  const onSelection = useCallback((kind, sel) => {
    setLiveHighlight({ page: sel.page, rects: sel.rects }) // replaces any previous one
    if (kind === 'annotate') {
      const note = prompt(`Annotate (page ${sel.page}):\n\n"${sel.text.slice(0, 160)}"`)
      if (!note) return
      setAnnotations((a) => [...a, { id: crypto.randomUUID(), ...sel, note, at: Date.now() }])
      return
    }
    if (!doc) return
    if (sel.page < range[0] || sel.page > range[1]) {
      setError(`Page ${sel.page} is outside the context range (${range[0]}–${range[1]}). Widen it first.`)
      return
    }
    const hit = store.findExistingChat(chatsRef.current, sel.text)
    if (hit) { setThreadId(hit.id); setFocus(false); return }

    const id = crypto.randomUUID()
    setChats((cs) => [...cs, {
      id, page: sel.page, selection: sel.text, rects: sel.rects,
      mode: 'technical', customInstruction: '', messages: [],
    }])
    setThreadId(id)
    setNotesOpen(false)
    setFocus(false)
    // Armed, not sent: the user picks a mode first, then Enter/Send fires it.
  }, [doc, range])

  // Mode clicks only arm the mode — nothing is sent until Enter/Ask.
  const onSetMode = useCallback((id, mode, custom) => {
    setChats((cs) => cs.map((c) => c.id === id
      ? { ...c, mode, customInstruction: custom ?? c.customInstruction } : c))
  }, [])

  // --- resizable chat ---
  const startResize = (e) => {
    e.preventDefault()
    const move = (ev) => {
      const w = Math.min(720, Math.max(300, window.innerWidth - ev.clientX))
      setSettings((s) => ({ ...s, chatWidth: w }))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.classList.remove('resizing')
    }
    document.body.classList.add('resizing')
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  // Esc closes settings; E exits focus.
  useEffect(() => {
    const onKey = (e) => {
      const t = document.activeElement?.tagName
      if (t === 'INPUT' || t === 'TEXTAREA') return
      if (e.key === 'Escape') { setSettingsOpen(false); setFocus(false) }
      if (focus && e.key.toLowerCase() === 'e') setFocus(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus])

  const activeFile = pending || filesRef.current.get(activeId)
  const hasPaper = !!activeFile
  const bump = (d) => setZoom((z) => clampZoom(z + d))

  return (
    <div
      className={'app' + (focus ? ' focused' : '')}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false)
        openFile([...e.dataTransfer.files].find((f) => f.type === 'application/pdf'))
      }}
    >
      <input
        ref={fileInput} type="file" accept="application/pdf" hidden
        onChange={(e) => { openFile(e.target.files[0]); e.target.value = '' }}
      />

      <Rail
        library={library}
        activeId={activeId}
        onPick={pickPaper}
        onAdd={() => fileInput.current?.click()}
        paperDark={settings.paperDark}
        onToggleDark={() => setSettings({ ...settings, paperDark: !settings.paperDark })}
        onFocus={() => setFocus((f) => !f)}
        onSettings={() => setSettingsOpen(true)}
        onNotes={() => { setNotesOpen((n) => !n); setFocus(false) }}
        notesOn={notesOpen}
        hasPaper={hasPaper}
      />

      <div className="stage">
        {!hasPaper ? (
          <div className={'drop' + (dragging ? ' over' : '')}>
            <div className="drop-in">
              <h1>Lattice Reader</h1>
              <p>Ask one thing at a time. How you want it.</p>
              <button className="cta" onClick={() => fileInput.current?.click()}>
                {pending ? 'Opening…' : 'Choose a PDF'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="topbar">
              {!doc ? (
                <span className="focus-hint">reading paper…</span>
              ) : focus ? (
                <>
                  <span className="focus-hint">press <kbd>E</kbd> to exit focus mode</span>
                  <div className="zoomer">
                    <button onClick={() => bump(-0.15)}>−</button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => bump(0.15)}>+</button>
                  </div>
                </>
              ) : (
                <RangeBar
                  numPages={doc.numPages}
                  range={range}
                  locked={locked}
                  onChange={changeRange}
                  zoom={zoom}
                  onZoom={bump}
                />
              )}
            </div>

            <div className="split">
              <PdfViewer
                file={activeFile}
                paperDark={settings.paperDark}
                zoom={zoom}
                setZoom={setZoom}
                onDocLoaded={onDocLoaded}
                onSelection={onSelection}
                liveHighlight={liveHighlight}
              />
              {!focus && (
                <>
                  <div className="grip" onMouseDown={startResize} />
                  <div className="chat-slot" style={{ width: settings.chatWidth }}>
                    <ChatPanel
                      chats={chats}
                      activeId={threadId}
                      onSelectChat={setThreadId}
                      onCloseChat={(id) => {
                        setChats((cs) => cs.filter((c) => c.id !== id))
                        if (threadId === id) setThreadId(null)
                      }}
                      onSetMode={onSetMode}
                      onAsk={(id, text) => {
                        if (id === null) {
                          if (!text) return
                          const nid = crypto.randomUUID()
                          setChats((cs) => [...cs, {
                            id: nid, page: 0, selection: '', rects: [],
                            mode: 'custom', customInstruction: '', messages: [],
                            title: 'General',
                          }])
                          setThreadId(nid)
                          setTimeout(() => runTurn(nid, text, text), 0)
                          return
                        }
                        const chat = chatsRef.current.find((c) => c.id === id)
                        if (!chat) return
                        if (!chat.selection && !text) return // general thread needs text
                        if (!chat.selection && text) { runTurn(id, text, text); return }
                        const label = MODES.find((m) => m.id === chat.mode).label
                        if (!text) {
                          // Empty Enter = (re)explain in the armed mode.
                          const turn = buildUserTurn({
                            selection: chat.selection, mode: chat.mode, page: chat.page,
                            customInstruction: chat.customInstruction,
                          })
                          const verb = chat.messages.length ? 'Re-explain' : 'Explain'
                          runTurn(id, turn, verb + ' this passage. (' + label + ')')
                        } else if (chat.messages.length === 0) {
                          const turn = buildUserTurn({
                            selection: chat.selection, mode: chat.mode, page: chat.page,
                            customInstruction: chat.customInstruction,
                          }) + '\n\nADDITIONALLY: ' + text
                          runTurn(id, turn, 'Explain this passage. (' + label + ') — ' + text)
                        } else {
                          runTurn(id, text, text)
                        }
                      }}
                      onEditSelection={(id, text) =>
                        setChats((cs) => cs.map((c) => c.id === id ? { ...c, selection: text } : c))}
                      busy={busy}
                      error={error}
                      annotations={annotations}
                      onDeleteNote={(id) => setAnnotations((a) => a.filter((n) => n.id !== id))}
                      onJumpToNote={(a) => scrollToRect(a.page, a.rects && a.rects[0])}
                      notesOpen={notesOpen}
                      setNotesOpen={setNotesOpen}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        usage={usage}
        onResetUsage={() => { store.resetUsage(); setUsage(store.loadUsage()) }}
      />
    </div>
  )
}
