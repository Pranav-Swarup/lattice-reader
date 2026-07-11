import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PdfViewer from './components/PdfViewer'
import ChatPanel from './components/ChatPanel'
import Settings from './components/Settings'
import { PROVIDERS, estimateCost } from './lib/llm'
import { BASE_SYSTEM, buildUserTurn, MODES } from './lib/modes'
import * as store from './lib/store'

export default function App() {
  const [file, setFile] = useState(null)
  const [doc, setDoc] = useState(null)        // { numPages, fullText }
  const [docId, setDocId] = useState(null)
  const [chats, setChats] = useState([])
  const [annotations, setAnnotations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(store.loadSettings)
  const [usage, setUsage] = useState(store.loadUsage)
  const [dragging, setDragging] = useState(false)

  useEffect(() => store.saveSettings(settings), [settings])
  useEffect(() => store.saveUsage(usage), [usage])
  useEffect(() => { if (docId) store.saveDoc(docId, { chats, annotations }) }, [docId, chats, annotations])

  const handleDocLoaded = useCallback(async (d) => {
    setDoc(d)
    const id = await store.fingerprint(file, d.firstPageText)
    setDocId(id)
    const saved = store.loadDoc(id)
    setChats(saved.chats)
    setAnnotations(saved.annotations)
  }, [file])

  // --- LLM ---
  const callLLM = useCallback(async (messages) => {
    const prov = PROVIDERS[settings.provider]
    const key = settings.keys[settings.provider]
    if (settings.provider !== 'ollama' && !key) throw new Error('Add an API key in Settings first.')
    const r = await prov.send({
      apiKey: key,
      model: settings.model,
      system: BASE_SYSTEM(doc.fullText),
      messages,
      baseUrl: settings.ollamaUrl,
    })
    const cost = estimateCost(settings.provider, settings.model, r.usage) ?? 0
    setUsage((u) => ({
      calls: u.calls + 1,
      inputTokens: u.inputTokens + r.usage.inputTokens,
      outputTokens: u.outputTokens + r.usage.outputTokens,
      cacheReadTokens: u.cacheReadTokens + r.usage.cacheReadTokens,
      cacheWriteTokens: u.cacheWriteTokens + r.usage.cacheWriteTokens,
      cost: u.cost + cost,
    }))
    return r.text
  }, [settings, doc])

  const runTurn = useCallback(async (chatId, userMsg, display) => {
    setBusy(true); setError('')
    try {
      const chat = chatsRef.current.find((c) => c.id === chatId)
      const history = chat.messages.map(({ role, content }) => ({ role, content }))
      const next = [...history, { role: 'user', content: userMsg }]
      setChats((cs) => cs.map((c) => c.id === chatId
        ? { ...c, messages: [...c.messages, { role: 'user', content: userMsg, display }] } : c))
      const text = await callLLM(next)
      setChats((cs) => cs.map((c) => c.id === chatId
        ? { ...c, messages: [...c.messages, { role: 'assistant', content: text }] } : c))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }, [callLLM])

  const chatsRef = useRef(chats)
  useEffect(() => { chatsRef.current = chats }, [chats])

  // --- Selection handlers (G / A) ---
  const onSelection = useCallback((kind, sel) => {
    if (kind === 'annotate') {
      const note = window.prompt(`Annotate (p${sel.page}):\n\n"${sel.text.slice(0, 160)}"`)
      if (!note) return
      setAnnotations((a) => [...a, { id: crypto.randomUUID(), ...sel, note, at: Date.now() }])
      return
    }

    if (!doc) return
    const existing = store.findExistingChat(chatsRef.current, sel.text)
    if (existing) { setActiveId(existing.id); return }

    const id = crypto.randomUUID()
    const chat = {
      id, page: sel.page, selection: sel.text, rects: sel.rects,
      mode: 'technical', customInstruction: '', messages: [],
    }
    setChats((cs) => [...cs, chat])
    setActiveId(id)
    const turn = buildUserTurn({ selection: sel.text, mode: 'technical', page: sel.page })
    setTimeout(() => runTurn(id, turn, 'Explain this passage. (Technical)'), 0)
  }, [doc, runTurn])

  const onSetMode = useCallback((chatId, mode, custom) => {
    setChats((cs) => cs.map((c) => c.id === chatId
      ? { ...c, mode, customInstruction: custom ?? c.customInstruction } : c))
    const chat = chatsRef.current.find((c) => c.id === chatId)
    if (!chat) return
    if (mode === 'custom' && custom === undefined) return // just opened the box
    const turn = buildUserTurn({
      selection: chat.selection, mode, page: chat.page,
      customInstruction: custom ?? chat.customInstruction,
    })
    const label = MODES.find((m) => m.id === mode).label
    setTimeout(() => runTurn(chatId, turn, `Re-explain this passage. (${label})`), 0)
  }, [runTurn])

  const highlights = useMemo(() => [
    ...chats.map((c) => ({
      page: c.page, rects: c.rects, kind: c.id === activeId ? 'active' : 'chat',
      title: 'Open thread', onClick: () => setActiveId(c.id),
    })),
    ...annotations.map((a) => ({
      page: a.page, rects: a.rects, kind: 'note', title: a.note,
    })),
  ], [chats, annotations, activeId])

  // --- Drop zone ---
  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const f = [...e.dataTransfer.files].find((f) => f.type === 'application/pdf')
    if (f) reset(f)
  }
  const reset = (f) => {
    setFile(f); setDoc(null); setDocId(null); setChats([]); setAnnotations([]); setActiveId(null); setError('')
  }

  return (
    <div
      className="app"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <nav>
        <div className="brand">
          <span className="mark" />
          Lattice&nbsp;<em>Reader</em>
        </div>
        <div className="nav-r">
          {doc && <span className="meta">{doc.numPages} pages · {chats.length} threads · {annotations.length} notes</span>}
          <span className="meta cost">${usage.cost.toFixed(4)}</span>
          <button
            className={`toggle ${settings.paperDark ? 'on' : ''}`}
            onClick={() => setSettings({ ...settings, paperDark: !settings.paperDark })}
          >
            Invert paper
          </button>
          {file && <label className="ghost file">
            Open another
            <input type="file" accept="application/pdf" hidden
              onChange={(e) => e.target.files[0] && reset(e.target.files[0])} />
          </label>}
          <button className="ghost" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </nav>

      <main>
        {!file ? (
          <div className={`drop ${dragging ? 'over' : ''}`}>
            <div className="drop-in">
              <h1>Read the paper. Ask about one paragraph at a time.</h1>
              <p>
                Drop a PDF anywhere. Select a passage and press <kbd>G</kbd> — you get a thread that
                explains just that passage, with the whole paper as context. Press <kbd>A</kbd> to annotate.
              </p>
              <label className="cta">
                Choose a PDF
                <input type="file" accept="application/pdf" hidden
                  onChange={(e) => e.target.files[0] && reset(e.target.files[0])} />
              </label>
              <span className="drop-note">Nothing is uploaded. The file stays in this tab.</span>
            </div>
          </div>
        ) : (
          <>
            <PdfViewer
              file={file}
              paperDark={settings.paperDark}
              onDocLoaded={handleDocLoaded}
              onSelection={onSelection}
              highlights={highlights}
            />
            <ChatPanel
              chats={chats}
              activeId={activeId}
              onSelectChat={setActiveId}
              onCloseChat={(id) => {
                setChats((cs) => cs.filter((c) => c.id !== id))
                if (activeId === id) setActiveId(null)
              }}
              onSetMode={onSetMode}
              onAsk={(id, text) => runTurn(id, text, text)}
              busy={busy}
              error={error}
            />
          </>
        )}
      </main>

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
