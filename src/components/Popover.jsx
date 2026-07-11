import { useEffect, useRef } from 'react'

// Anchored flyout used by rail buttons. Rendered at a high z-index so it sits
// above the PDF pane; closes on outside click or Escape.
export default function Popover({ open, anchorRect, onClose, children, title }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !anchorRect) return null
  const top = Math.min(anchorRect.top, window.innerHeight - 220)
  return (
    <div
      className="pop"
      ref={ref}
      style={{ left: anchorRect.right + 10, top: Math.max(10, top) }}
    >
      {title && <div className="pop-title">{title}</div>}
      {children}
    </div>
  )
}
