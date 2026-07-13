import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { jsPDF } from 'jspdf'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// Same maths as the on-screen CSS filter: invert luminance, then rotate hue 180°
// so photographs and figures come back to roughly their true colours instead of
// turning into negatives.
function invertPixels(data) {
  for (let i = 0; i < data.length; i += 4) {
    // invert(1)
    const r = 255 - data[i], g = 255 - data[i + 1], b = 255 - data[i + 2]
    // hue-rotate(180deg) reduces to reflecting each channel about its luminance
    const l = 0.213 * r + 0.715 * g + 0.072 * b
    let nr = 2 * l - r, ng = 2 * l - g, nb = 2 * l - b
    // brightness(.92) contrast(1.05), matching the on-screen filter
    nr = (nr * 0.92 - 128) * 1.05 + 128
    ng = (ng * 0.92 - 128) * 1.05 + 128
    nb = (nb * 0.92 - 128) * 1.05 + 128
    data[i] = clamp8(nr); data[i + 1] = clamp8(ng); data[i + 2] = clamp8(nb)
  }
}
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0)

// Rasterises each page, inverts it, and rebuilds a PDF from the images.
// The result is image-only: no selectable text. That is unavoidable client-side.
export async function invertPdf(file, onProgress) {
  const buf = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buf }).promise

  let out = null
  const SCALE = 2 // ~144dpi; readable without exploding file size

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    invertPixels(img.data)
    ctx.putImageData(img, 0, 0)

    // Page size in points (72dpi) so the output matches the original dimensions.
    const pw = viewport.width / SCALE
    const ph = viewport.height / SCALE
    const orient = pw > ph ? 'l' : 'p'

    if (!out) out = new jsPDF({ orientation: orient, unit: 'pt', format: [pw, ph] })
    else out.addPage([pw, ph], orient)

    out.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pw, ph)
    canvas.width = canvas.height = 0 // release
    onProgress?.(i, doc.numPages)
  }

  return out.output('blob')
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
