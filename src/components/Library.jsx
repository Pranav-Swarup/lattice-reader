import { useEffect, useRef, useState } from 'react'
import { docStats } from '../lib/store'

function when(ts) {
  if (!ts) return 'never opened'
  const d = Math.floor((Date.now() - ts) / 86400000)
  if (d <= 0) {
    const h = Math.floor((Date.now() - ts) / 3600000)
    if (h <= 0) return 'just now'
    return h === 1 ? '1 hour ago' : `${h} hours ago`
  }
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d} days ago`
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Library({ library, activeId, liveStats, onOpen, onDelete, onRename, onAdd, dragging }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.select(), 20) }, [editing])

  const clean = (n) => n.replace(/\.pdf$/i, '')
  const commit = () => {
    if (editing && draft.trim()) onRename(editing, draft.trim())
    setEditing(null)
  }

  return (
    <div className={'library' + (dragging ? ' over' : '')}>
      <header className="lib-head">
        <h1>Lattice Reader</h1>
        <p>Ask one thing at a time. How you want it.</p>
      </header>

      <div className="lib-grid">
        {library.map((p) => {
          const st = liveStats && liveStats.id === p.id ? liveStats : docStats(p.id)
          return (
            <div key={p.id} className={'card' + (p.id === activeId ? ' on' : '')}>
              <button className="card-hit" onClick={() => editing !== p.id && onOpen(p)}>
                <div className="card-face">
                  <span className="card-n">{p.n}</span>

                  <span className="card-title" title={clean(p.name)}>{clean(p.name)}</span>

                  <div className="card-stats">
                    <div className="stat">
                      <b>{st.threads}</b>
                      <span>{st.threads === 1 ? 'thread' : 'threads'}</span>
                    </div>
                    <div className="stat">
                      <b>{st.notes}</b>
                      <span>{st.notes === 1 ? 'note' : 'notes'}</span>
                    </div>
                    <div className="stat">
                      <b>{st.highlights}</b>
                      <span>{st.highlights === 1 ? 'highlight' : 'highlights'}</span>
                    </div>
                  </div>

                  <span className="card-when">{when(p.openedAt || p.addedAt)}</span>
                </div>
              </button>

              <div className="card-tools">
                <button className="card-btn" title="Rename"
                  onClick={() => { setEditing(p.id); setDraft(clean(p.name)) }}>
                  <svg viewBox="0 0 20 20"><path d="M13 3.5l3.5 3.5L7 16.5H3.5V13z" /></svg>
                </button>
                <button className="card-btn del" title="Delete" onClick={() => onDelete(p)}>
                  <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg>
                </button>
              </div>

              {editing === p.id && (
                <div className="card-editing" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    ref={inputRef} className="card-rename" value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commit() }
                      if (e.key === 'Escape') { e.preventDefault(); setEditing(null) }
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}

        <div className="card add">
          <button className="card-hit" onClick={onAdd}>
            <div className="card-face">
              <svg className="card-doc" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              <span className="card-add-label">Add a document</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
