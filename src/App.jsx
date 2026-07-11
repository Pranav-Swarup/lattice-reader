import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PdfViewer, { clampZoom, scrollToRect } from './components/PdfViewer'
import ChatPanel from './components/ChatPanel'
import Settings from './components/Settings'
import Rail from './components/Rail'
import RangeBar from './components/RangeBar'
import Modal from './components/Modal'
import Popover from './components/Popover'
import Library from './components/Library'
import { PROVIDERS } from './lib/llm'
import { BASE_SYSTEM, buildUserTurn, MODES } from './lib/modes'
import { applyTheme, HIGHLIGHT_COLORS } from './lib/themes'
import * as store from './lib/store'

export default function App() {
  const [settings, setSettings] = useState(store.loadSettings)
  const [usage, setUsage] = useState(store.loadUsage)
  const [library, setLibrary] = useState(store.loadLibrary)

  const filesRef = useRef(new Map())
  const [activeId, setActiveId] = useState(null)
  const [doc, setDoc] = useState(null)
  const [pending, setPending] = useState(null)
  const [showLibrary, setShowLibrary] = useState(true)

  const [range, setRange] = useState([1, 1])
  const [chats, setChats] = useState([])
  const [annotations, setAnnotations] = useState([])
  const [highlights, setHighlights] = useState([]) // persistent, from H
  const [threadId, setThreadId] = useState(null)

  const [zoom, setZoom] = useState(1.3)
  const [focus, setFocus] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [threadsOpen, setThreadsOpen] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [selHighlight, setSelHighlight] = useState(null) // transient (G / note focus)
  const [modal, setModal] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [pop, setPop] = useState(null) // {key, rect}

  const fileInput = useRef(null)
  const chatsRef = useRef(chats)
  useEffect(() => { chatsRef.current = chats }, [chats])
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => { applyTheme(settings.theme) }, [settings.theme])
  useEffect(() => store.saveSettings(settings), [settings])
  useEffect(() => store.saveUsage(usage), [usage])
  useEffect(() => store.saveLibrary(library), [library])
  useEffect(() => {
    if (activeId) store.saveDoc(activeId, { chats, annotations, highlights, range })
  }, [activeId, chats, annotations, highlights, range])

  const locked = chats.length > 0

  const onDocLoaded = useCallback(async (d) => {
    setDoc(d)
    const file = pending
    if (!file) return
    const id = await store.fingerprint(file, d.pages[0] || '')
    filesRef.current.set(id, file)
    setPending(null)
    setLibrary((lib) => lib.some((p) => p.id === id)
      ? lib
      : [...lib, { id, n: lib.length + 1, name: file.name, addedAt: Date.now() }])
    const saved = store.loadDoc(id)
    setActiveId(id)
    setChats(saved.chats)
    setAnnotations(saved.annotations)
    setHighlights(saved.highlights || [])
    setRange(saved.range || [1, d.numPages])
    setThreadId(null); setError(''); setSelHighlight(null); setShowLibrary(false)
  }, [pending])

  const openFile = (f) => {
    if (!f || f.type !== 'application/pdf') return
    setDoc(null); setThreadId(null); setError(''); setSelHighlight(null)
    setPending(f)
    setShowLibrary(false) // leave the library so the viewer mounts and parses
  }

  const openPaper = (p) => {
    const f = filesRef.current.get(p.id)
    if (!f) {
      setModal({
        kind: 'missing', name: p.name.replace(/\.pdf$/i, ''),
        onOk: () => { setModal(null); fileInput.current?.click() },
      })
      return
    }
    if (p.id === activeId && doc) { setShowLibrary(false); return }
    setDoc(null); setThreadId(null); setError(''); setSelHighlight(null)
    setPending(f); setShowLibrary(false)
  }

  // "Close" just returns to the library. Deletion happens there, explicitly.
  const backToLibrary = () => { setShowLibrary(true); setChatCollapsed(false); setFocus(false) }

  const deletePaper = (p) => setModal({
    kind: 'delete', name: p.name.replace(/\.pdf$/i, ''),
    onOk: () => {
      store.dropDoc(p.id)
      filesRef.current.delete(p.id)
      setLibrary((lib) => lib.filter((x) => x.id !== p.id).map((x, i) => ({ ...x, n: i + 1 })))
      if (p.id === activeId) {
        setActiveId(null); setDoc(null); setChats([]); setAnnotations([]); setHighlights([])
        setThreadId(null); setSelHighlight(null)
      }
      setModal(null)
    },
  })

  const contextText = useMemo(() => {
    if (!doc) return ''
    return doc.pages.slice(range[0] - 1, range[1])
      .map((t, i) => `\n--- page ${range[0] + i} ---\n${t}`).join('\n')
  }, [doc, range])

  const callLLM = useCallback(async (messages) => {
    const prov = PROVIDERS[settings.provider]
    const key = settings.keys[settings.provider]
    if (settings.provider !== 'ollama' && !key) throw new Error('Add an API key in Settings first.')
    const r = await prov.send({
      apiKey: key, model: settings.model,
      system: BASE_SYSTEM(contextText, range),
      messages, baseUrl: settings.ollamaUrl,
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
    setSelHighlight(null)
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
    } finally { setBusy(false) }
  }, [callLLM])

  const onSelection = useCallback((kind, sel) => {
    if (kind === 'highlight') {
      const color = settingsRef.current.highlightColor || 'yellow'
      setHighlights((h) => [...h, { id: crypto.randomUUID(), ...sel, color }])
      return
    }
    setSelHighlight({ page: sel.page, rects: sel.rects })
    if (kind === 'annotate') { setNoteDraft(''); setModal({ kind: 'note', sel }); return }
    if (!doc) return
    if (sel.page < range[0] || sel.page > range[1]) {
      setError(`Page ${sel.page} is outside the context range (${range[0]}–${range[1]}).`)
      return
    }
    const hit = store.findExistingChat(chatsRef.current, sel.text)
    if (hit) { setThreadId(hit.id); setNotesOpen(false); setThreadsOpen(false); setFocus(false); return }
    const id = crypto.randomUUID()
    setChats((cs) => [...cs, {
      id, page: sel.page, selection: sel.text, rects: sel.rects,
      mode: 'technical', customInstruction: '', messages: [],
    }])
    setThreadId(id); setNotesOpen(false); setThreadsOpen(false); setFocus(false); setChatCollapsed(false)
  }, [doc, range])

  const onSetMode = useCallback((id, mode, custom) => {
    setChats((cs) => cs.map((c) => c.id === id
      ? { ...c, mode, customInstruction: custom ?? c.customInstruction } : c))
  }, [])

  const ask = (id, text) => {
    if (id === null) {
      if (!text) return
      const nid = crypto.randomUUID()
      setChats((cs) => [...cs, {
        id: nid, page: 0, selection: '', rects: [],
        mode: 'custom', customInstruction: '', messages: [], title: 'General',
      }])
      setThreadId(nid)
      setTimeout(() => runTurn(nid, text, text), 0)
      return
    }
    const chat = chatsRef.current.find((c) => c.id === id)
    if (!chat) return
    if (!chat.selection) { if (text) runTurn(id, text, text); return }
    const label = MODES.find((m) => m.id === chat.mode).label
    const base = buildUserTurn({
      selection: chat.selection, mode: chat.mode, page: chat.page,
      customInstruction: chat.customInstruction,
    })
    if (!text) {
      const verb = chat.messages.length ? 'Re-explain' : 'Explain'
      runTurn(id, base, `${verb} this passage. (${label})`)
    } else if (chat.messages.length === 0) {
      runTurn(id, base + '\n\nADDITIONALLY: ' + text, `Explain this snippet. (${label}) — ${text}`)
    } else {
      runTurn(id, text, text)
    }
  }

  const startResize = (e) => {
    e.preventDefault()
    const move = (ev) => {
      const w = Math.min(760, Math.max(320, window.innerWidth - ev.clientX))
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

  useEffect(() => {
    const onKey = (e) => {
      const t = document.activeElement?.tagName
      if (t === 'INPUT' || t === 'TEXTAREA' || modal) return
      if (e.key === 'Escape') { setSettingsOpen(false); setFocus(false); setPop(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  const activeFile = pending || filesRef.current.get(activeId)
  const hasPaper = !!activeFile && !showLibrary
  const bump = (d) => setZoom((z) => clampZoom(z + d))
  const popAt = (key, rect) => setPop((p) => (p?.key === key ? null : { key, rect }))

  // Everything painted on the page: saved highlights + the transient selection.
  const paint = useMemo(() => {
    const hs = highlights.map((h) => ({
      page: h.page, rects: h.rects, color: h.color, kind: 'saved',
      onRemove: () => setHighlights((all) => all.filter((x) => x.id !== h.id)),
    }))
    if (selHighlight) hs.push({ ...selHighlight, kind: 'sel' })
    return hs
  }, [highlights, selHighlight])

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
      <input ref={fileInput} type="file" accept="application/pdf" hidden
        onChange={(e) => { openFile(e.target.files[0]); e.target.value = '' }} />

      {!focus && (
        <Rail
          library={library} activeId={activeId} onPick={openPaper}
          onAdd={() => fileInput.current?.click()}
          onLibrary={backToLibrary}
          paperDark={settings.paperDark}
          onToggleDark={() => setSettings({ ...settings, paperDark: !settings.paperDark })}
          onFocus={() => setFocus(true)}
          onSettings={() => setSettingsOpen(true)}
          onNotes={() => { setNotesOpen((v) => !v); setThreadsOpen(false); setChatCollapsed(false) }}
          notesOn={notesOpen}
          onThreads={() => { setThreadsOpen((v) => !v); setNotesOpen(false); setChatCollapsed(false) }}
          threadsOn={threadsOpen}
          onHighlighter={() => {}}
          highlighterOn={pop?.key === 'highlight'}
          onContext={() => {}}
          contextLocked={locked}
          hasPaper={!!activeFile && !showLibrary}
          popRef={popAt}
        />
      )}

      <div className="stage">
        {showLibrary || !activeFile ? (
          library.length === 0 ? (
            <div className={'drop' + (dragging ? ' over' : '')}>
              <div className="drop-in">
                <h1>Lattice Reader</h1>
                <p>Ask one thing at a time. How you want it.</p>
                <button className="cta" onClick={() => fileInput.current?.click()}>
                  {pending ? 'Opening…' : 'Add a document'}
                </button>
              </div>
            </div>
          ) : (
          <Library
            library={library} activeId={activeId} dragging={dragging}
            onOpen={openPaper} onDelete={deletePaper}
            onRename={(id, name) =>
              setLibrary((lib) => lib.map((x) => x.id === id ? { ...x, name } : x))}
            onAdd={() => fileInput.current?.click()}
          />
          )
        ) : (
          <div className="split">
            <div className="reader">
              {!focus && (
                <button className="reader-close" onClick={backToLibrary} title="Back to documents">
                  <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg>
                </button>
              )}

              <PdfViewer
                file={activeFile}
                paperDark={settings.paperDark}
                zoom={zoom} setZoom={setZoom}
                onDocLoaded={onDocLoaded}
                onSelection={onSelection}
                paint={paint}
              />

              <div className="zoomer vert">
                <button onClick={() => bump(0.15)} title="Zoom in">+</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => bump(-0.15)} title="Zoom out">−</button>
              </div>

              {focus && (
                <button className="focus-exit" onClick={() => setFocus(false)} title="Exit focus mode">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />
                  </svg>
                </button>
              )}
            </div>

            {!focus && !chatCollapsed && (
              <>
                <div className="grip" onMouseDown={startResize} />
                <div className="chat-slot" style={{ width: settings.chatWidth }}>
                  <ChatPanel
                    chats={chats} activeId={threadId}
                    onSelectChat={(id) => { setThreadId(id); setNotesOpen(false); setThreadsOpen(false) }}
                    onCloseChat={(id) => {
                      setChats((cs) => cs.filter((c) => c.id !== id))
                      if (threadId === id) setThreadId(null)
                    }}
                    onSetMode={onSetMode}
                    onAsk={ask}
                    onEditSelection={(id, text) =>
                      setChats((cs) => cs.map((c) => c.id === id ? { ...c, selection: text } : c))}
                    busy={busy} error={error}
                    annotations={annotations}
                    onDeleteNote={(id) => {
                      setAnnotations((a) => a.filter((n) => n.id !== id))
                      setSelHighlight(null) // clear its highlight immediately
                    }}
                    onJumpToNote={(a) => {
                      setSelHighlight({ page: a.page, rects: a.rects })
                      scrollToRect(a.page, a.rects && a.rects[0])
                    }}
                    onBlurNote={() => setSelHighlight(null)}
                    notesOpen={notesOpen} setNotesOpen={setNotesOpen}
                    listOpen={threadsOpen} setListOpen={setThreadsOpen}
                    onCollapse={() => setChatCollapsed(true)}
                  />
                </div>
              </>
            )}

            {!focus && chatCollapsed && (
              <button className="chat-stub" onClick={() => setChatCollapsed(false)} title="Expand chat">
                <svg viewBox="0 0 20 20"><path d="M12 4L6 10l6 6" /></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* --- rail popovers --- */}
      <Popover open={pop?.key === 'highlight'} anchorRect={pop?.rect}
        onClose={() => setPop(null)} title="Highlight colour">
        <div className="swatch-list">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              className={'swatch-row' + (settings.highlightColor === c.id ? ' on' : '')}
              onClick={() => { setSettings({ ...settings, highlightColor: c.id }); setPop(null) }}
            >
              <i style={{ '--ink-color': c.css }} />
              {c.name}
            </button>
          ))}
        </div>
        <p className="pop-note">Select text and press <kbd>H</kbd>. Right-click a highlight to remove it.</p>
      </Popover>

      <Popover open={pop?.key === 'context' && !!doc} anchorRect={pop?.rect}
        onClose={() => setPop(null)} title="Context pages">
        <p className="pop-note">Only these pages are sent to the model.</p>
        {doc && (
          <RangeBar numPages={doc.numPages} range={range} locked={locked} onChange={setRange} />
        )}
      </Popover>

      {/* --- modals --- */}
      <Modal
        open={modal?.kind === 'delete'}
        title="Delete document?"
        body={<>Remove “{modal?.name}” from the Reader?<br /><br />All threads will be lost.</>}
        confirmLabel="Delete" danger
        onConfirm={() => modal.onOk()} onCancel={() => setModal(null)}
      />
      <Modal
        open={modal?.kind === 'note'}
        title={'Annotate page ' + (modal?.sel?.page ?? '')}
        body={modal?.sel?.text.replace(/\s+/g, ' ').slice(0, 180)}
        confirmLabel="Save note" input
        inputValue={noteDraft} onInputChange={setNoteDraft}
        onConfirm={() => {
          if (noteDraft.trim()) {
            setAnnotations((a) => [...a, {
              id: crypto.randomUUID(), ...modal.sel, note: noteDraft.trim(), at: Date.now(),
            }])
          }
          setModal(null); setSelHighlight(null)
        }}
        onCancel={() => { setModal(null); setSelHighlight(null) }}
      />
      <Modal
        open={modal?.kind === 'missing'}
        title="File not loaded"
        body={<>“{modal?.name}” isn’t open in this tab.<br /><br />Pick the file again — its threads are still saved.</>}
        confirmLabel="Choose file"
        onConfirm={() => modal.onOk()} onCancel={() => setModal(null)}
      />

      <Settings
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        settings={settings} setSettings={setSettings}
        usage={usage}
        onResetUsage={() => { store.resetUsage(); setUsage(store.loadUsage()) }}
      />
    </div>
  )
}
