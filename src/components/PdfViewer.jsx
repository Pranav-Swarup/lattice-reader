import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 3
export const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

// Reading-order text extraction for one- and two-column layouts.
export function extractInReadingOrder(items, pageWidth) {
  const its = items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0 }))
  if (!its.length) return ''

  const mid = pageWidth / 2
  const crossing = its.filter((it) => it.x < mid - 8 && it.x + it.w > mid + 8)
  const left = its.filter((it) => it.x + it.w <= mid + 8)
  const right = its.filter((it) => it.x >= mid - 8)
  const twoCol =
    crossing.length / its.length < 0.2 &&
    left.length > its.length * 0.25 &&
    right.length > its.length * 0.25

  const lines = (arr) => {
    const sorted = [...arr].sort((a, b) => b.y - a.y || a.x - b.x)
    const out = []
    let cur = [], curY = null
    for (const it of sorted) {
      if (curY === null || Math.abs(it.y - curY) < 4) {
        cur.push(it); curY = curY === null ? it.y : (curY + it.y) / 2
      } else { out.push(cur); cur = [it]; curY = it.y }
    }
    if (cur.length) out.push(cur)
    return out.map((l) => l.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ')).join('\n')
  }

  if (!twoCol) return lines(its)

  const spans = crossing
  const lcol = its.filter((it) => !spans.includes(it) && it.x + it.w / 2 < mid)
  const rcol = its.filter((it) => !spans.includes(it) && it.x + it.w / 2 >= mid)

  const spanSorted = [...spans].sort((a, b) => b.y - a.y)
  const spanLines = []
  for (const it of spanSorted) {
    const last = spanLines[spanLines.length - 1]
    if (last && Math.abs(last.y - it.y) < 4) { last.items.push(it); continue }
    spanLines.push({ y: it.y, items: [it] })
  }
  const between = (arr, top, bot) => arr.filter((it) => it.y < top - 2 && it.y >= bot - 2)

  const out = []
  let top = Infinity
  for (const sl of spanLines) {
    const l = lines(between(lcol, top, sl.y)); if (l) out.push(l)
    const r = lines(between(rcol, top, sl.y)); if (r) out.push(r)
    out.push(sl.items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' '))
    top = sl.y
  }
  const l = lines(between(lcol, top, -Infinity)); if (l) out.push(l)
  const r = lines(between(rcol, top, -Infinity)); if (r) out.push(r)
  return out.filter(Boolean).join('\n')
}

export default function PdfViewer({
  file, paperDark, zoom, setZoom, onDocLoaded, onSelection, liveHighlight,
}) {
  const scrollRef = useRef(null)
  const hostRef = useRef(null)
  const [pdf, setPdf] = useState(null)
  const [rendered, setRendered] = useState(0)
  const [status, setStatus] = useState('')

  // ---- load + extract ----
  useEffect(() => {
    if (!file) return
    let dead = false
    ;(async () => {
      setStatus('Reading file')
      const buf = await file.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: buf }).promise
      if (dead) return
      setPdf(doc)
      setStatus('Extracting text')
      const pages = []
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i)
        const tc = await p.getTextContent()
        const vp = p.getViewport({ scale: 1 })
        pages.push(extractInReadingOrder(tc.items, vp.width))
      }
      if (dead) return
      setStatus('')
      onDocLoaded({ numPages: doc.numPages, pages })
    })()
    return () => { dead = true }
  }, [file])

  // ---- render at the real zoom scale, debounced ----
  // No CSS zoom / transform tricks: they broke text-layer alignment, scroll
  // anchoring, and cross-monitor scaling. Canvases are backed at
  // devicePixelRatio so they're crisp on any display.
  useEffect(() => {
    if (!pdf || !hostRef.current) return
    let dead = false
    const t = setTimeout(async () => {
      const host = hostRef.current
      if (!host || dead) return

      // Preserve relative scroll position across the re-render.
      const scroller = scrollRef.current
      const ratio = scroller && scroller.scrollHeight > 0
        ? scroller.scrollTop / scroller.scrollHeight : 0

      host.innerHTML = ''
      // THE critical line: pdf.js v4 TextLayer sizes and places every glyph via
      // calc(var(--scale-factor) * ...). Without this set on an ancestor, the
      // invisible text layer never aligns with the painted canvas — the root
      // cause of every selection bug so far.
      host.style.setProperty('--scale-factor', String(zoom))
      setRendered(0)

      for (let i = 1; i <= pdf.numPages; i++) {
        if (dead) return
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: zoom })
        const dpr = window.devicePixelRatio || 1

        const wrap = document.createElement('div')
        wrap.className = 'page'
        wrap.dataset.page = String(i)
        wrap.style.width = viewport.width + 'px'
        wrap.style.height = viewport.height + 'px'

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = viewport.width + 'px'
        canvas.style.height = viewport.height + 'px'
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        wrap.appendChild(canvas)

        const tl = document.createElement('div')
        tl.className = 'textLayer'
        wrap.appendChild(tl)

        const num = document.createElement('span')
        num.className = 'page-num'
        num.textContent = i
        wrap.appendChild(num)

        host.appendChild(wrap)
        await page.render({ canvasContext: ctx, viewport }).promise
        if (dead) return
        const tc = await page.getTextContent()
        await new pdfjsLib.TextLayer({ textContentSource: tc, container: tl, viewport }).render()
      }
      if (dead) return
      setRendered((r) => r + 1)
      if (scroller) scroller.scrollTop = ratio * scroller.scrollHeight
    }, 140) // debounce: wheel-zoom bursts collapse into one render
    return () => { dead = true; clearTimeout(t) }
  }, [pdf, zoom])

  // Ctrl/Cmd + wheel zoom over the paper.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setZoom])

  // ---- selection capture ----
  // Geometry from the spans' own layout offsets (page-local px), sliced by
  // character offsets. Now that --scale-factor is set, the spans sit exactly
  // over the painted glyphs, so these boxes match what the user sees.
  const capture = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
    const text = sel.toString().trim()
    if (text.length < 2) return null
    const range = sel.getRangeAt(0)

    const toEl = (n) => (n.nodeType === 3 ? n.parentElement : n)
    const pageEl = toEl(range.startContainer)?.closest('.page')
    if (!pageEl) return null
    const layer = pageEl.querySelector('.textLayer')
    if (!layer) return null
    const pw = parseFloat(pageEl.style.width)
    const ph = parseFloat(pageEl.style.height)
    if (!pw || !ph) return null

    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.textContent.trim() && range.intersectsNode(n)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    })

    const boxes = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const span = node.parentElement
      if (!span || !layer.contains(span)) continue
      const total = node.textContent.length || 1
      let a = 0, b = total
      if (node === range.startContainer) a = range.startOffset
      if (node === range.endContainer) b = Math.min(range.endOffset, total)
      if (b <= a) continue
      const tf = getComputedStyle(span).transform
      const sx = tf && tf !== 'none' ? new DOMMatrixReadOnly(tf).a || 1 : 1
      const w = span.offsetWidth * sx
      boxes.push({
        x: span.offsetLeft + (a / total) * w,
        y: span.offsetTop,
        w: ((b - a) / total) * w,
        h: span.offsetHeight,
      })
    }
    if (!boxes.length) return null

    boxes.sort((p, q) => p.y - q.y || p.x - q.x)
    const merged = []
    for (const bx of boxes) {
      const last = merged[merged.length - 1]
      if (last && Math.abs(last.y - bx.y) < bx.h * 0.6 && bx.x - (last.x + last.w) < 14) {
        const right = Math.max(last.x + last.w, bx.x + bx.w)
        last.y = Math.min(last.y, bx.y)
        last.h = Math.max(last.h, bx.h)
        last.w = right - last.x
      } else merged.push({ ...bx })
    }

    const rects = merged
      .map((r) => ({ x: r.x / pw, y: r.y / ph, w: r.w / pw, h: r.h / ph }))
      .filter((r) => r.w > 0 && r.h > 0)
    if (!rects.length) return null
    return { text, page: Number(pageEl.dataset.page), rects }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = document.activeElement?.tagName
      if (t === 'INPUT' || t === 'TEXTAREA') return
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

  // ---- ONE live highlight, nothing persistent ----
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.querySelectorAll('.hl').forEach((n) => n.remove())
    if (!rendered || !liveHighlight) return
    const pageEl = host.querySelector('.page[data-page="' + liveHighlight.page + '"]')
    if (!pageEl) return
    for (const r of liveHighlight.rects || []) {
      const box = document.createElement('div')
      box.className = 'hl'
      box.style.cssText =
        'left:' + r.x * 100 + '%;top:' + r.y * 100 + '%;width:' + r.w * 100 + '%;height:' + r.h * 100 + '%'
      pageEl.appendChild(box)
    }
  }, [liveHighlight, rendered])

  return (
    <div className={'viewer' + (paperDark ? ' paper-dark' : '')} ref={scrollRef}>
      {status && <div className="viewer-status">{status}…</div>}
      <div className="pages" ref={hostRef} />
    </div>
  )
}

// Scroll the viewer to a page position (used by annotation jump).
export function scrollToRect(page, rect) {
  const pageEl = document.querySelector('.viewer .page[data-page="' + page + '"]')
  const viewer = document.querySelector('.viewer')
  if (!pageEl || !viewer) return
  const y = pageEl.offsetTop + (rect ? rect.y * pageEl.offsetHeight : 0)
  viewer.scrollTo({ top: Math.max(0, y - viewer.clientHeight * 0.25), behavior: 'smooth' })
}
