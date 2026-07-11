import { useEffect, useRef } from 'react'

// Replaces window.confirm / window.prompt with something that matches the UI.
export default function Modal({ open, title, body, confirmLabel = 'Confirm', danger,
  input, inputValue, onInputChange, onConfirm, onCancel }) {
  const ref = useRef(null)
  useEffect(() => {
    if (open && input) setTimeout(() => ref.current?.focus(), 30)
  }, [open, input])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      if (e.key === 'Enter' && (!input || !e.shiftKey)) { e.preventDefault(); onConfirm() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, input, onConfirm, onCancel])

  if (!open) return null
  return (
    <div className="modal-bg" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {body && <p className="modal-body">{body}</p>}
        {input && (
          <textarea
            ref={ref}
            rows={3}
            value={inputValue}
            placeholder="Your note…"
            onChange={(e) => onInputChange(e.target.value)}
          />
        )}
        <div className="modal-actions">
          <button className="ghost" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
