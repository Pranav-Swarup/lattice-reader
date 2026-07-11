import { useEffect, useState } from 'react'

// Scopes how much of the paper gets sent as context. Locks once a thread exists,
// because changing it would invalidate every answer already given.
export default function RangeBar({ numPages, range, locked, onChange, onZoom, zoom }) {
  const [lo, setLo] = useState(range[0])
  const [hi, setHi] = useState(range[1])
  useEffect(() => { setLo(range[0]); setHi(range[1]) }, [range])

  const commit = (nlo, nhi) => {
    const a = Math.max(1, Math.min(numPages, Number(nlo) || 1))
    const b = Math.max(a, Math.min(numPages, Number(nhi) || numPages))
    setLo(a); setHi(b)
    if (a === range[0] && b === range[1]) return
    onChange([a, b])
  }

  const pct = (v) => ((v - 1) / Math.max(1, numPages - 1)) * 100

  return (
    <div className={'rangebar' + (locked ? ' locked' : '')}>
      <span className="rb-label">
        Context pages
        {locked && <em>locked — a thread is open</em>}
      </span>

      <div className="rb-track" aria-hidden={locked}>
        <div className="rb-fill" style={{ left: pct(lo) + '%', right: 100 - pct(hi) + '%' }} />
        <input
          type="range" min={1} max={numPages} value={lo} disabled={locked}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi))}
          onMouseUp={() => commit(lo, hi)}
          onTouchEnd={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
        />
        <input
          type="range" min={1} max={numPages} value={hi} disabled={locked}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo))}
          onMouseUp={() => commit(lo, hi)}
          onTouchEnd={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
        />
      </div>

      <div className="rb-nums">
        <input type="number" min={1} max={numPages} value={lo} disabled={locked}
          onChange={(e) => setLo(e.target.value)} onBlur={() => commit(lo, hi)} />
        <span>–</span>
        <input type="number" min={1} max={numPages} value={hi} disabled={locked}
          onChange={(e) => setHi(e.target.value)} onBlur={() => commit(lo, hi)} />
        <em>of {numPages}</em>
      </div>

      <div className="zoomer">
        <button onClick={() => onZoom(-0.15)} title="Zoom out">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoom(0.15)} title="Zoom in">+</button>
      </div>
    </div>
  )
}
