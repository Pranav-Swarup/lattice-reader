import { useEffect, useRef, useState } from 'react'
import { useInverter } from './InvertTool'

const I = {
  home: <><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.6V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.6"/><path d="M9.8 20v-5.6h4.4V20"/></>,
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
        onMouseEnter={(e) => {
          const btn = e.currentTarget.querySelector('button')
          if (btn) setBox(btn.getBoundingClientRect())
        }}
        onMouseLeave={() => setBox(null)}
      >
        <button {...rest} className={className}>{children}</button>
      </span>
      {box && label && (
        <span
          className={'railtip' + (rest.disabled ? ' muted' : '')}
          style={{
            left: box.right + 12,
            top: Math.max(16, Math.min(box.top + box.height / 2, window.innerHeight - 16)),
          }}
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

// Hovering the invert button reveals a side flyout with a download action.
// While an export is running (or finished and waiting to be saved) the flyout
// stays pinned open, so moving the mouse away doesn't hide the progress.
function InvertControl({ paperDark, onToggleDark, disabled, activeFile }) {
  const [hovering, setHovering] = useState(false)
  const [box, setBox] = useState(null)
  const { state, msg, pct, run, download, reset, isFor } = useInverter()
  const timer = useRef(null)
  const btnRef = useRef(null)

  // A finished export belongs to one specific file. When the open document
  // changes, drop it — otherwise the button stays stuck on "Download" and
  // refuses to invert the new document.
  useEffect(() => {
    if (state === 'ready' && !isFor(activeFile)) reset()
    if (state === 'error') reset()
  }, [activeFile])

  const busy = state === 'working'
  const done = state === 'ready' && isFor(activeFile)
  const pinned = busy || done            // can't be dismissed by moving away
  const open = hovering || pinned

  const place = () => {
    const b = btnRef.current?.getBoundingClientRect()
    if (b) setBox(b)
  }
  const show = () => { clearTimeout(timer.current); place(); setHovering(true) }
  const hide = () => { timer.current = setTimeout(() => setHovering(false), 220) }

  useEffect(() => { if (pinned) place() }, [pinned])

  return (
    <>
      <span className="tip-wrap" onMouseEnter={show} onMouseLeave={hide}>
        <button
          ref={btnRef}
          className={'tool' + (paperDark ? ' on' : '') + (pinned ? ' pinned' : '')}
          onClick={onToggleDark}
          disabled={disabled}
        >
          <Ico d={I.invert} />
        </button>
      </span>

      {open && box && (
        <div
          className="invert-fly"
          style={{
            left: box.right + 12,
            top: Math.max(90, Math.min(box.top + box.height / 2, window.innerHeight - 100)),
          }}
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={hide}
        >
          <span className="fly-label">Invert document</span>

          <button
            className={'fly-btn' + (done ? ' ready' : '')}
            disabled={!activeFile || busy}
            onClick={() => {
              if (done) { download(); reset(); setHovering(false) }  // dismiss once saved
              else run(activeFile)
            }}
          >
            <svg viewBox="0 0 20 20">
              <path d="M10 3v10M6 9.5l4 4 4-4M4 16.5h12" />
            </svg>
            {busy ? 'Inverting…' : done ? 'Download PDF' : 'Export copy'}
          </button>

          {busy && (
            <div className="fly-bar"><span style={{ width: pct + '%' }} /></div>
          )}
          {msg && <span className={'fly-msg' + (state === 'error' ? ' err' : '')}>{msg}</span>}
          {state === 'idle' && <span className="fly-note">Exports an image-only PDF.</span>}
        </div>
      )}
    </>
  )
}

export default function Rail({
  library, activeId, onPick, onAdd, onLibrary,
  paperDark, onToggleDark, onFocus, onSettings,
  onNotes, notesOn, onThreads, threadsOn,
  onHighlighter, highlighterOn, onContext, contextLocked, hasPaper, popRef, activeFile,
}) {
  const shelf = [...library].reverse()
  const track = (key) => (e) => popRef(key, e.currentTarget.getBoundingClientRect())

  return (
    <nav className="rail">
      <div className="rail-top">
        <Tip className="brandmark" onClick={onLibrary} label="All documents">
          <Ico d={I.home} />
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
        <InvertControl
          paperDark={paperDark} onToggleDark={onToggleDark}
          disabled={!hasPaper} activeFile={activeFile}
        />
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
