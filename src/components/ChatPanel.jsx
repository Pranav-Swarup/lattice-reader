import { useEffect, useRef, useState } from 'react'
import { MODES } from '../lib/modes'

export default function ChatPanel({
  chats, activeId, onSelectChat, onCloseChat, onSetMode, onAsk, busy, error,
}) {
  const chat = chats.find((c) => c.id === activeId)
  const [draft, setDraft] = useState('')
  const [custom, setCustom] = useState('')
  const endRef = useRef(null)

  useEffect(() => { setCustom(chat?.customInstruction || '') }, [activeId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat?.messages.length, busy])

  return (
    <aside className="chat">
      <header className="chat-head">
        <div className="threads">
          {chats.length === 0 && <span className="threads-empty">No threads yet</span>}
          {chats.map((c) => (
            <button
              key={c.id}
              className={`thread ${c.id === activeId ? 'on' : ''}`}
              onClick={() => onSelectChat(c.id)}
              title={c.selection}
            >
              <span className="thread-pg">p{c.page}</span>
              {c.selection.replace(/\s+/g, ' ').slice(0, 28)}…
              <span className="thread-x" onClick={(e) => { e.stopPropagation(); onCloseChat(c.id) }}>×</span>
            </button>
          ))}
        </div>
      </header>

      {!chat ? (
        <div className="chat-empty">
          <p>Select text in the paper and press <kbd>G</kbd> to open a thread about it.</p>
          <p>Press <kbd>A</kbd> instead to leave an annotation.</p>
        </div>
      ) : (
        <>
          <div className="modes">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={`mode ${chat.mode === m.id ? 'on' : ''}`}
                onClick={() => onSetMode(chat.id, m.id)}
                title={m.blurb}
              >
                {m.label}
              </button>
            ))}
          </div>

          {chat.mode === 'custom' && (
            <div className="custom-row">
              <input
                value={custom}
                placeholder="e.g. relate this to reinforcement learning; give me the intuition behind the loss"
                onChange={(e) => setCustom(e.target.value)}
                onBlur={() => onSetMode(chat.id, 'custom', custom)}
              />
            </div>
          )}

          <div className="quote">
            <span className="quote-pg">page {chat.page}</span>
            {chat.selection.replace(/\s+/g, ' ')}
          </div>

          <div className="msgs">
            {chat.messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
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
              placeholder="Ask a follow-up about this passage…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!draft.trim() || busy) return
                  onAsk(chat.id, draft.trim())
                  setDraft('')
                }
              }}
            />
            <button
              disabled={busy || !draft.trim()}
              onClick={() => { onAsk(chat.id, draft.trim()); setDraft('') }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
