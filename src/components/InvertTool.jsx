import { useRef, useState } from 'react'
import { invertPdf, downloadBlob } from '../lib/invertPdf'

// Shared by the mobile screen and the desktop hover flyout.
// States: idle -> working -> ready (download) | error
export function useInverter() {
  const [state, setState] = useState('idle')   // idle | working | ready | error
  const [msg, setMsg] = useState('')
  const [pct, setPct] = useState(0)
  const blobRef = useRef(null)
  const nameRef = useRef('inverted.pdf')
  // Which file the current blob belongs to. Without this, switching documents
  // leaves the button stuck on "Download" for the *previous* document's export.
  const forRef = useRef(null)

  const run = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setState('error'); setMsg('That is not a PDF.')
      return
    }
    setState('working'); setMsg('Inverting…'); setPct(0)
    try {
      const blob = await invertPdf(file, (i, n) => {
        setMsg(`Page ${i} of ${n}`)
        setPct(Math.round((i / n) * 100))
      })
      blobRef.current = blob
      nameRef.current = file.name.replace(/\.pdf$/i, '') + ' (inverted).pdf'
      forRef.current = fileKey(file)
      setState('ready'); setMsg('')
    } catch (e) {
      setState('error'); setMsg(String(e.message || e).slice(0, 120))
    }
  }

  const download = () => {
    if (blobRef.current) downloadBlob(blobRef.current, nameRef.current)
  }

  const reset = () => {
    blobRef.current = null; forRef.current = null
    setState('idle'); setMsg(''); setPct(0)
  }

  // True when the finished export matches the file being asked about.
  const isFor = (file) => !!file && forRef.current === fileKey(file)

  return { state, msg, pct, run, download, reset, isFor }
}

const fileKey = (f) => (f ? `${f.name}|${f.size}|${f.lastModified}` : null)

export function InvertButton({ className = 'cta' }) {
  const { state, msg, pct, run, download, reset } = useInverter()
  const input = useRef(null)

  // Picking a new file always starts fresh — otherwise the finished blob from
  // the previous document would still be sitting there ready to download.
  const pick = (f) => { reset(); run(f) }

  return (
    <div className="invert-tool">
      <input
        ref={input} type="file" accept="application/pdf" hidden
        onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }}
      />
      <button
        className={className}
        disabled={state === 'working'}
        onClick={() => {
          if (state === 'ready') { download(); reset(); return }
          input.current?.click()
        }}
      >
        {state === 'working' ? 'Inverting…'
          : state === 'ready' ? 'Download inverted PDF'
          : state === 'error' ? 'Try another PDF'
          : 'Invert a PDF'}
      </button>

      {state === 'working' && (
        <div className="fly-bar wide"><span style={{ width: pct + '%' }} /></div>
      )}
      {msg && <p className={'invert-msg' + (state === 'error' ? ' err' : '')}>{msg}</p>}
      {state === 'ready' && (
        <p className="invert-msg">
          Ready. <button className="linkish" onClick={() => input.current?.click()}>pick another</button>
        </p>
      )}
    </div>
  )
}
