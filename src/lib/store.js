const K = {
  settings: 'lattice.settings',
  usage: 'lattice.usage',
  docs: 'lattice.docs', // keyed by docId -> { chats, annotations }
}

const read = (k, fb) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb }
}
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))

export const loadSettings = () =>
  read(K.settings, {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    keys: {},
    ollamaUrl: 'http://localhost:11434',
    paperDark: true,
  })
export const saveSettings = (s) => write(K.settings, s)

export const loadUsage = () =>
  read(K.usage, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, calls: 0 })
export const saveUsage = (u) => write(K.usage, u)
export const resetUsage = () => write(K.usage, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, calls: 0 })

export const loadDoc = (docId) => read(K.docs, {})[docId] ?? { chats: [], annotations: [] }
export const saveDoc = (docId, doc) => {
  const all = read(K.docs, {})
  all[docId] = doc
  write(K.docs, all)
}

// Stable-ish id for a PDF: size + first/last text chunk.
export async function fingerprint(file, firstPageText) {
  const raw = `${file.name}|${file.size}|${(firstPageText || '').slice(0, 400)}`
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(raw))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

// --- Selection reuse ---
// Reuse an existing chat when the new selection is a subset of, or essentially the
// same as, one we've already answered. We normalize whitespace so that PDF line
// breaks don't defeat substring matching.
export const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()

export function findExistingChat(chats, selection) {
  const n = norm(selection)
  if (n.length < 3) return null
  for (const c of chats) {
    const cn = norm(c.selection)
    if (cn.includes(n)) return c            // new selection is a subset of an answered one
    if (n.includes(cn) && cn.length / n.length > 0.85) return c // near-identical
  }
  return null
}
