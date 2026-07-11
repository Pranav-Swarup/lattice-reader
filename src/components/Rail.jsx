export default function Rail({
  library, activeId, onPick, onAdd, paperDark, onToggleDark, onFocus, onSettings,
  onNotes, notesOn, hasPaper,
}) {
  const shelf = [...library].reverse() // newest on top, 1 stays at the bottom

  return (
    <nav className="rail">
      <div className="brandmark" title="Lattice Reader">
        <svg viewBox="0 0 24 24">
          <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11c.6 0 1 .4 1 1v15c0-.8-.9-1.5-2-1.5H5.5c-.8 0-1.5-.7-1.5-1.5v-11.5z" />
          <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13c-.6 0-1 .4-1 1v15c0-.8.9-1.5 2-1.5h4.5c.8 0 1.5-.7 1.5-1.5V5.5z" />
        </svg>
      </div>

      <div className="shelf">
        {shelf.map((p) => (
          <button
            key={p.id}
            className={'slot' + (p.id === activeId ? ' on' : '')}
            onClick={() => onPick(p)}
            title={p.name}
          >
            {p.n}
          </button>
        ))}
      </div>

      <div className="rail-tools">
        <button className="tool" onClick={onAdd} title="Add a paper">
          <svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" /></svg>
        </button>
        <button
          className={'tool' + (notesOn ? ' on' : '')}
          onClick={onNotes}
          disabled={!hasPaper}
          title="Your annotations"
        >
          <svg viewBox="0 0 20 20">
            <path d="M13.5 3.5l3 3L7 16H4v-3z" />
            <path d="M12 5l3 3" />
          </svg>
        </button>
        <button
          className={'tool' + (paperDark ? ' on' : '')}
          onClick={onToggleDark}
          disabled={!hasPaper}
          title="Invert paper"
        >
          <svg viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="6.5" />
            <path d="M10 3.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button className="tool" onClick={onFocus} disabled={!hasPaper} title="Focus mode">
          <svg viewBox="0 0 20 20">
            <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />
          </svg>
        </button>
        <button className="tool gear" onClick={onSettings} title="Settings">
          <svg viewBox="0 0 24 24">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.58 15a1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.86a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.08 4.1l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.12 3V3a2 2 0 1 1 4 0v.09c0 .68.4 1.29 1.03 1.56.6.26 1.3.13 1.79-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08c.27.62.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03z" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
