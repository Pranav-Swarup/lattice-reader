import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const SCALE = 1.45

export default function PdfViewer({ file, paperDark, onDocLoaded, onSelection, highlights }) {
  const hostRef = useRef(null)
  const [pdf, setPdf] = useState(null)
  const [status, setStatus] = useState('')

  // Load the document, extract full text for LLM context.
  useEffect(() => {
    if (!file) return
    let cancelled = false
    ;(async () => {
      setStatus('Reading file…')
      const buf = await file.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: buf }).promise
      if (cancelled) return
      setPdf(doc)

      setStatus('Extracting text…')
      const pages = []
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i)
        const tc = await p.getTextContent()
        pages.push(tc.items.map((it) => it.str).join(' '))
      }
      if (cancelled) return
      setStatus('')
      onDocLoaded({
        numPages: doc.numPages,
        fullText: pages.map((t, i) => `\n--- page ${i + 1} ---\n${t}`).join('\n'),
        firstPageText: pages[0] || '',
      })
    })()
    return () => { cancelled = true }
  }, [file])

  // Render all pages with a selectable text layer on top.
  useEffect(() => {
    if (!pdf || !hostRef.current) return
    const host = hostRef.current
    host.innerHTML = ''
    let cancelled = false

    ;(async () => {
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: SCALE })

        const wrap = document.createElement('div')
        wrap.className = 'page'
        wrap.dataset.page = String(i)
        wrap.style.width = `${viewport.width}px`
        wrap.style.height = `${viewport.height}px`

        const canvas = document.createElement('canvas')
        const dpr = window.devicePixelRatio || 1
        canvas.width = viewport.width * dpr
        canvas.height = viewport.height * dpr
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        wrap.appendChild(canvas)

        const textLayer = document.createElement('div')
        textLayer.className = 'textLayer'
        textLayer.style.width = `${viewport.width}px`
        textLayer.style.height = `${viewport.height}px`
        wrap.appendChild(textLayer)

        host.appendChild(wrap)

        await page.render({ canvasContext: ctx, viewport }).promise
        if (cancelled) return

        const tc = await page.getTextContent()
        const tl = new pdfjsLib.TextLayer({
          textContentSource: tc,
          container: textLayer,
          viewport,
        })
        await tl.render()
      }
    })()

    return () => { cancelled = true }
  }, [pdf])

  // Capture selection: text + page + rects (for highlight painting).
  const capture = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return null
    const text = sel.toString().trim()
    if (text.length < 2) return null

    const range = sel.getRangeAt(0)
    const pageEl = range.startContainer.parentElement?.closest('.page')
    if (!pageEl) return null
    const pageNum = Number(pageEl.dataset.page)

    const pr = pageEl.getBoundingClientRect()
    const rects = [...range.getClientRects()]
      .filter((r) => r.width > 1 && r.height > 1)
      .map((r) => ({
        x: (r.left - pr.left) / pr.width,
        y: (r.top - pr.top) / pr.height,
        w: r.width / pr.width,
        h: r.height / pr.height,
      }))

    return { text, page: pageNum, rects }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k !== 'g' && k !== 'a') return
      const s = capture()
      if (!s) return
      e.preventDefault()
      onSelection(k === 'g' ? 'explain' : 'annotate', s)
      window.getSelection()?.removeAllRanges()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [capture, onSelection])

  // Paint saved highlights as absolutely-positioned boxes over each page.
  useEffect(() => {
    if (!hostRef.current) return
    hostRef.current.querySelectorAll('.hl').forEach((n) => n.remove())
    for (const h of highlights) {
      const pageEl = hostRef.current.querySelector(`.page[data-page="${h.page}"]`)
      if (!pageEl) continue
      for (const r of h.rects || []) {
        const box = document.createElement('div')
        box.className = `hl hl-${h.kind}`
        box.style.left = `${r.x * 100}%`
        box.style.top = `${r.y * 100}%`
        box.style.width = `${r.w * 100}%`
        box.style.height = `${r.h * 100}%`
        box.title = h.title || ''
        box.onclick = () => h.onClick?.()
        pageEl.appendChild(box)
      }
    }
  }, [highlights, pdf])

  return (
    <div className={`viewer ${paperDark ? 'paper-dark' : ''}`}>
      {status && <div className="viewer-status">{status}</div>}
      <div className="pages" ref={hostRef} />
    </div>
  )
}
