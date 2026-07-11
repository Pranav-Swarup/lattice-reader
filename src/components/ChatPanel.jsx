import { useEffect, useRef, useState } from 'react'
import { MODES } from '../lib/modes'
import Markdown from './Markdown'

export default function ChatPanel({
  chats, activeId, onSelectChat, onCloseChat, onSetMode, onAsk, onEditSelection,
  busy, error, annotations, onDeleteNote, onJumpToNote, notesOpen, setNotesOpen,
  listOpen, setListOpen, onCollapse, onBlurNote,
}) {
  const chat = chats.find((c) => c.id === activeId)
  const [draft, setDraft] = useState('')
  const [custom, setCustom] = useState('')
  const [selNote, setSelNote] = useState(null)
  const endRef = useRef(null)

  useEffect(() => { setCustom(chat?.customInstruction || '') }, [activeId])
  useEffect(() => { if (!notesOpen && selNote) { setSelNote(null); onBlurNote?.() } }, [notesOpen])
  // Clicking anywhere that isn't a note card deselects the current annotation.
  useEffect(() => {
    if (!selNote) return
    const onDown = (e) => {
      if (e.target.closest?.('.note-card')) return
      setSelNote(null)
      onBlurNote?.()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [selNote, onBlurNote])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat?.messages.length, busy])

  const started = chat && chat.messages.length > 0
  const modeLabel = chat && MODES.find((m) => m.id === chat.mode)?.label

  const snippet = (t, n = 44) => {
    const s = t.replace(/\s+/g, ' ').trim()
    return s.length > n ? s.slice(0, n) + '…' : s
  }

  // Vertical thread list — replaces the chip strip.
  const ThreadList = () => (
    <div className="tlist">
      {chats.length === 0 && <div className="tlist-empty">No threads yet.</div>}
      {[...chats].reverse().map((c) => (
        <button
          key={c.id}
          className={'titem' + (c.id === activeId ? ' on' : '')}
          onClick={() => { onSelectChat(c.id); setListOpen(false); setNotesOpen(false) }}
        >
          <span className="titem-pg">{c.page ? 'p' + c.page : '·'}</span>
          <span className="titem-txt">{c.selection ? snippet(c.selection) : (c.title || 'General')}</span>
          <span className="titem-n">{Math.ceil(c.messages.length / 2)}</span>
          <span
            className="titem-x"
            onClick={(e) => { e.stopPropagation(); onCloseChat(c.id) }}
            title="Delete thread"
          >×</span>
        </button>
      ))}
    </div>
  )

  return (
    <aside className="chat">
      <header className="chat-head2">
        <button
          className={'head-btn' + (listOpen && !notesOpen ? ' on' : '')}
          onClick={() => { setListOpen((v) => !v); setNotesOpen(false) }}
        >
          <svg viewBox="0 0 16 16"><path d="M2 4h12M2 8h12M2 12h8" /></svg>
          Threads
          <span className="count">{chats.length}</span>
        </button>
        {chat && !notesOpen && !listOpen && (
          <span className="head-now" title={chat.selection || 'General'}>
            {chat.selection ? 'p' + chat.page + ' · ' + snippet(chat.selection, 30) : (chat.title || 'General')}
          </span>
        )}
        <button className="collapse" onClick={onCollapse} title="Collapse panel">
          <svg viewBox="0 0 20 20"><path d="M8 4l6 6-6 6" /></svg>
        </button>
      </header>

      {notesOpen ? (
        <div className="notes">
          {!annotations.length && (
            <div className="chat-empty">
              <p>No annotations yet. Select text in the paper and press <kbd>A</kbd>.</p>
            </div>
          )}
          {annotations.map((a) => (
            <div
              className={'note-card' + (selNote === a.id ? ' on' : '')}
              key={a.id}
              onClick={() => {
                if (selNote === a.id) { setSelNote(null); onBlurNote() }
                else { setSelNote(a.id); onJumpToNote(a) }
              }}
            >
              <div className="note-src">
                <span className="titem-pg">p{a.page}</span> {snippet(a.text, 100)}
              </div>
              <div className="note-body">{a.note}</div>
              <button className="note-del" onClick={(e) => {
                e.stopPropagation()
                if (selNote === a.id) setSelNote(null)
                onDeleteNote(a.id)
              }}>delete</button>
            </div>
          ))}
        </div>
      ) : listOpen ? (
        <ThreadList />
      ) : !chat ? (
        <>
          <div className="chat-empty">
            <p>Ask anything about the document below, or select text and press <kbd>G</kbd> to open a thread about that passage. <kbd>A</kbd> annotates.</p>
          </div>
          <div className="composer">
            <textarea
              rows={2}
              value={draft}
              placeholder="Ask anything about the document…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (busy || !draft.trim()) return
                  onAsk(null, draft.trim())
                  setDraft('')
                }
              }}
            />
            <button
              className="send"
              disabled={busy || !draft.trim()}
              title="Send"
              onClick={() => { onAsk(null, draft.trim()); setDraft('') }}
            >
              <svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></svg>
            </button>
          </div>
        </>
      ) : (
        <>
          {chat.selection && <div className="modes">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={'mode' + (chat.mode === m.id ? ' on' : '')}
                onClick={() => onSetMode(chat.id, m.id)}
                title={m.blurb}
              >
                {m.label}
              </button>
            ))}
          </div>}

          {chat.selection && chat.mode === 'custom' && (
            <div className="custom-row">
              <input
                value={custom}
                placeholder="Instruction appended to every message in this thread…"
                onChange={(e) => setCustom(e.target.value)}
                onBlur={() => onSetMode(chat.id, 'custom', custom)}
              />
            </div>
          )}

          {/* Selection is editable until the first message is sent. */}
          {chat.selection !== '' && <div className="quote-wrap">
            <span className="quote-pg">
              page {chat.page}{!started && <em> — editable</em>}
            </span>
            <textarea
              className="quote-edit"
              value={chat.selection}
              readOnly={started}
              rows={3}
              onChange={(e) => onEditSelection(chat.id, e.target.value)}
              title={started ? 'Locked once the thread has started' : 'Fix the extracted text before sending'}
            />
          </div>}

          <div className="msgs">
                        {chat.messages.map((m, i) => (
              <div key={i} className={'msg ' + m.role}>
                {m.role === 'assistant'
                  ? <Markdown text={m.content} />
                  : (m.display || m.content)}
              </div>
            ))}
            {busy && <div className="msg assistant pending">Thinking…</div>}
            {error && <div className="msg err">{error}</div>}
            <div ref={endRef} />
          </div>

          <div className="composer">
            <textarea
              rows={2}
              value={draft}
              autoFocus
              placeholder={
                !chat.selection
                  ? 'Ask anything about the document…'
                  : started
                    ? 'Ask a follow-up…'
                    : 'Press Enter to ask…'
              }
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (busy) return
                  onAsk(chat.id, draft.trim())
                  setDraft('')
                }
              }}
            />
            <button
              className="send"
              disabled={busy}
              title={started && draft.trim() ? 'Send' : 'Ask'}
              onClick={() => { onAsk(chat.id, draft.trim()); setDraft('') }}
            >
              <svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></svg>
            </button>
          </div>
          {chat.selection && (
            <div className="composer-hint">
              {started
                ? <>Empty <kbd>Enter</kbd> re-asks in <b>{modeLabel}</b> mode.</>
                : <><b>{modeLabel}</b> mode armed. <kbd>Enter</kbd> sends; type first to add instructions.</>}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
