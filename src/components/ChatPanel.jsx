import { useEffect, useRef, useState } from 'react'
import { MODES } from '../lib/modes'

export default function ChatPanel({
  chats, activeId, onSelectChat, onCloseChat, onSetMode, onAsk, onEditSelection,
  busy, error, annotations, onDeleteNote, onJumpToNote, notesOpen, setNotesOpen,
}) {
  const chat = chats.find((c) => c.id === activeId)
  const [draft, setDraft] = useState('')
  const [custom, setCustom] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { setCustom(chat?.customInstruction || ''); setListOpen(false) }, [activeId])
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
      </header>

      {notesOpen ? (
        <div className="notes">
          {!annotations.length && (
            <div className="chat-empty">
              <p>No annotations yet. Select text in the paper and press <kbd>A</kbd>.</p>
            </div>
          )}
          {annotations.map((a) => (
            <div className="note-card" key={a.id} onClick={() => onJumpToNote(a)}>
              <div className="note-src">
                <span className="titem-pg">p{a.page}</span> {snippet(a.text, 100)}
              </div>
              <div className="note-body">{a.note}</div>
              <button className="note-del" onClick={(e) => { e.stopPropagation(); onDeleteNote(a.id) }}>delete</button>
            </div>
          ))}
        </div>
      ) : listOpen ? (
        <ThreadList />
      ) : !chat ? (
        <>
          <div className="chat-empty">
            <p>Ask anything about the paper below, or select text and press <kbd>G</kbd> to open a thread about that passage. <kbd>A</kbd> annotates.</p>
          </div>
          <div className="composer">
            <textarea
              rows={2}
              value={draft}
              placeholder="Ask anything about the paper…"
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
              disabled={busy || !draft.trim()}
              onClick={() => { onAsk(null, draft.trim()); setDraft('') }}
            >
              Send
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
            {chat.selection !== '' && chat.messages.length === 0 && !busy && (
              <div className="armed-hint">
                <b>{modeLabel}</b> mode armed. Press <kbd>Enter</kbd> to ask,
                or type extra instructions first.
              </div>
            )}
            {chat.messages.map((m, i) => (
              <div key={i} className={'msg ' + m.role}>
                {m.role === 'user' && m.display ? m.display : m.content}
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
                  ? 'Ask anything about the paper…'
                  : started
                    ? 'Follow-up… (empty Enter re-asks in ' + modeLabel + ' mode)'
                    : 'Enter sends the ' + modeLabel + ' explanation…'
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
              disabled={busy}
              onClick={() => { onAsk(chat.id, draft.trim()); setDraft('') }}
            >
              {started && draft.trim() ? 'Send' : 'Ask'}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
