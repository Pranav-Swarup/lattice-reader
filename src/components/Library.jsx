import { useEffect, useRef, useState } from 'react'

export default function Library({ library, activeId, onOpen, onDelete, onRename, onAdd, dragging }) {
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
        {library.map((p) => (
          <div key={p.id} className={'card' + (p.id === activeId ? ' on' : '')}>
            <button className="card-hit" onClick={() => editing !== p.id && onOpen(p)}>
              <div className="card-face">
                <span className="card-n">{p.n}</span>
                <svg className="card-doc" viewBox="0 0 24 24">
                  <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                  <path d="M14 3v4h4" />
                </svg>
              </div>
            </button>

            <div className="card-tools">
              <button
                className="card-btn"
                title="Rename"
                onClick={() => { setEditing(p.id); setDraft(clean(p.name)) }}
              >
                <svg viewBox="0 0 20 20"><path d="M13 3.5l3.5 3.5L7 16.5H3.5V13z" /></svg>
              </button>
              <button className="card-btn del" title="Delete" onClick={() => onDelete(p)}>
                <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg>
              </button>
            </div>

            {editing === p.id ? (
              <input
                ref={inputRef}
                className="card-rename"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commit() }
                  if (e.key === 'Escape') { e.preventDefault(); setEditing(null) }
                }}
              />
            ) : (
              <span className="card-name" title={clean(p.name)}>{clean(p.name)}</span>
            )}
          </div>
        ))}

        <div className="card add">
          <button className="card-hit" onClick={onAdd}>
            <div className="card-face">
              <svg className="card-doc" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
            </div>
          </button>
          <span className="card-name">Add a document</span>
        </div>
      </div>
    </div>
  )
}
