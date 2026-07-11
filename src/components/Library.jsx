export default function Library({ library, activeId, onOpen, onDelete, onAdd, dragging }) {
  return (
    <div className={'library' + (dragging ? ' over' : '')}>
      <header className="lib-head">
        <h1>Lattice Reader</h1>
        <p>Ask one thing at a time. How you want it.</p>
      </header>

      <div className="lib-grid">
        {library.map((p) => (
          <button key={p.id} className={'card' + (p.id === activeId ? ' on' : '')} onClick={() => onOpen(p)}>
            <span
              className="card-del"
              title="Delete document"
              onClick={(e) => { e.stopPropagation(); onDelete(p) }}
            >
              <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg>
            </span>
            <div className="card-face">
              <span className="card-n">{p.n}</span>
              <svg className="card-doc" viewBox="0 0 24 24">
                <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                <path d="M14 3v4h4" />
              </svg>
            </div>
            <span className="card-name">{p.name.replace(/\.pdf$/i, '')}</span>
          </button>
        ))}

        <button className="card add" onClick={onAdd}>
          <div className="card-face">
            <svg className="card-doc" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          </div>
          <span className="card-name">Add a paper</span>
        </button>
      </div>
    </div>
  )
}
