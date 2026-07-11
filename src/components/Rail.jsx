import { useState } from 'react'

const I = {
  book: <><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11c.6 0 1 .4 1 1v15c0-.8-.9-1.5-2-1.5H5.5c-.8 0-1.5-.7-1.5-1.5v-11.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13c-.6 0-1 .4-1 1v15c0-.8.9-1.5 2-1.5h4.5c.8 0 1.5-.7 1.5-1.5V5.5z"/></>,
  threads: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4z"/><path d="M8 8h8M8 12h5"/></>,
  marker: <><path d="M15.5 3.5l5 5-8 8H8l-1.5-4 9-9z"/><path d="M4 21h16"/><path d="M12.5 6.5l5 5"/></>,
  add: <path d="M12 5v14M5 12h14"/>,
  invert: <><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none"/></>,
  focus: <><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/><path d="M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5"/></>,
  pages: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></>,
  gear: <><circle cx="12" cy="12" r="3.1"/><path d="M19.14 12.94a7.6 7.6 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.6 7.6 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64z"/></>,
}
const Ico = ({ d }) => <svg viewBox="0 0 24 24">{d}</svg>

// The rail has overflow:hidden, so an absolutely-positioned tooltip inside it
// gets clipped and can't escape its stacking context. Render it fixed instead,
// positioned from the button's own rect.
function Tip({ label, children, className, ...rest }) {
  const [box, setBox] = useState(null)
  return (
    <>
      <span
        className="tip-wrap"
        onMouseEnter={(e) => setBox(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setBox(null)}
      >
        <button {...rest} className={className}>{children}</button>
      </span>
      {box && label && (
        <span
          className={'railtip' + (rest.disabled ? ' muted' : '')}
          style={{ left: box.right + 12, top: box.top + box.height / 2 }}
        >
          {label}
        </span>
      )}
    </>
  )
}

// Stylised typographic A for annotations.
const AnnotA = () => (
  <svg viewBox="0 0 24 24" className="glyph-a">
    <text x="12" y="18" textAnchor="middle">A</text>
  </svg>
)

export default function Rail({
  library, activeId, onPick, onAdd, onLibrary,
  paperDark, onToggleDark, onFocus, onSettings,
  onNotes, notesOn, onThreads, threadsOn,
  onHighlighter, highlighterOn, onContext, contextLocked, hasPaper, popRef,
}) {
  const shelf = [...library].reverse()
  const track = (key) => (e) => popRef(key, e.currentTarget.getBoundingClientRect())

  return (
    <nav className="rail">
      <div className="rail-top">
        <Tip className="brandmark" onClick={onLibrary} label="All documents">
          <Ico d={I.book} />
        </Tip>
        <Tip
          className={'tool' + (threadsOn ? ' on' : '')}
          onClick={onThreads} disabled={!hasPaper} label="Threads"
        ><Ico d={I.threads} /></Tip>
        <Tip
          className={'tool' + (notesOn ? ' on' : '')}
          onClick={onNotes} disabled={!hasPaper} label="Annotations"
        ><AnnotA /></Tip>
      </div>

      <div className="shelf-wrap">
        <div className="shelf">
          {shelf.map((p) => (
            <Tip
              key={p.id}
              className={'slot' + (p.id === activeId ? ' on' : '')}
              onClick={() => onPick(p)}
              label={p.name.replace(/\.pdf$/i, '')}
            >
              {p.n}
            </Tip>
          ))}
        </div>
      </div>

      <div className="rail-tools">
        <Tip className="tool" onClick={onAdd} label="Add a document"><Ico d={I.add} /></Tip>
        <Tip
          className={'tool' + (highlighterOn ? ' on' : '')}
          onClick={(e) => { track('highlight')(e); onHighlighter() }}
          disabled={!hasPaper} label="Highlight colour"
        ><Ico d={I.marker} /></Tip>
        <Tip
          className={'tool' + (paperDark ? ' on' : '')}
          onClick={onToggleDark} disabled={!hasPaper} label="Invert paper"
        ><Ico d={I.invert} /></Tip>
        <Tip className="tool" onClick={onFocus} disabled={!hasPaper} label="Focus mode">
          <Ico d={I.focus} />
        </Tip>
        <Tip
          className="tool"
          onClick={(e) => { track('context')(e); onContext() }}
          disabled={!hasPaper || contextLocked}
          label={contextLocked ? 'Close all threads to change context' : 'Context pages'}
        ><Ico d={I.pages} /></Tip>
        <Tip className="tool gear" onClick={onSettings} label="Settings">
          <Ico d={I.gear} />
        </Tip>
      </div>
    </nav>
  )
}
