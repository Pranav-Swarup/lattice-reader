const K = {
  settings: 'lattice.settings',
  usage: 'lattice.usage',
  library: 'lattice.library', // [{id, name, size, addedAt}] — order = shelf order
  docs: 'lattice.docs.v2', // v2: rect geometry changed; old highlights would paint wrong       // id -> { chats, annotations, range }
}

const read = (k, fb) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb }
}
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))

export const loadSettings = () =>
  read(K.settings, {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite',
    keys: {},
    ollamaUrl: 'http://localhost:11434',
    paperDark: false,
    chatWidth: 400,
  })
export const saveSettings = (s) => write(K.settings, s)

const ZERO = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 0 }
export const loadUsage = () => read(K.usage, ZERO)
export const saveUsage = (u) => write(K.usage, u)
export const resetUsage = () => write(K.usage, ZERO)

// --- library: papers persist as metadata only. PDFs are not stored (no backend,
// and localStorage can't hold them). Sessions survive; the file must be re-dropped.
export const loadLibrary = () => read(K.library, [])
export const saveLibrary = (l) => write(K.library, l)

export const loadDoc = (id) => read(K.docs, {})[id] ?? { chats: [], annotations: [], range: null }
export const saveDoc = (id, doc) => {
  const all = read(K.docs, {})
  all[id] = doc
  write(K.docs, all)
}
export const dropDoc = (id) => {
  const all = read(K.docs, {})
  delete all[id]
  write(K.docs, all)
}

export async function fingerprint(file, firstPageText) {
  const raw = `${file.name}|${file.size}|${(firstPageText || '').slice(0, 400)}`
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(raw))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()

// Reuse a thread when the new selection is inside one we've already answered.
export function findExistingChat(chats, selection) {
  const n = norm(selection)
  if (n.length < 3) return null
  for (const c of chats) {
    const cn = norm(c.selection)
    if (cn.includes(n)) return c
    if (n.includes(cn) && cn.length / n.length > 0.85) return c
  }
  return null
}
