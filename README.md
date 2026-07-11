# Lattice Reader

*Ask one thing at a time. How you want it.*

Select a passage, press **G**, get an explanation of *that passage only* , with the paper as context. Press **A** to annotate.

No backend. The PDF or API Keys never leaves the tab. Keys and sessions sit in localStorage.

## Run
```bash
npm install && npm run dev
```

## Deploy
`render.yaml` included. Static site, `npm ci && npm run build`, publish `dist`.

## Keys

| | |
|---|---|
| `G` | explain selection |
| `A` | annotate selection |
| `E` | exit focus mode |
| `Esc` | close settings / focus |
| `Ctrl`/`Cmd` + scroll | zoom, while over the paper |

## The rail

Papers stack bottom-up: 1 stays at the bottom, 2 appears above it. Each paper is a fully isolated session — its own threads, annotations, and page range. Below the shelf: add, invert, focus, settings.

## Page range

The slider scopes how much of the paper is sent as context. Locks once the first thread opens, because changing it would invalidate every answer already given; editing it then prompts, and discards that paper's threads (annotations survive).

Practical use: a 60-page paper with appendices costs the same per question as its 8-page core. Scope to the core.

## Notes

- **Prompt caching.** On Anthropic the paper goes in the system block with `cache_control: ephemeral`. First call writes the cache; every snippet after reads it at ~10% cost. Keep this if you refactor — it's the whole economics of the tool.
- **Thread reuse.** `store.findExistingChat` normalizes whitespace and checks whether a new selection sits inside an already-answered one. If so it reopens that thread instead of spending a call.
- **Dark paper** is `invert(1) hue-rotate(180deg)` on the canvas. Hue-rotate undoes the color flip, so figures survive while text inverts.
- **Files are not persisted.** localStorage cannot hold a PDF. Sessions survive a reload; the file must be re-dropped, and the fingerprint (name + size + first-page text) reattaches it to its threads.

## Gaps

- Text extraction is naive `getTextContent()` — two-column papers interleave. This is the first thing worth fixing; it degrades the context you're paying to cache.
- Responses render as plain text, no markdown.
- Thread reuse is substring-based, not geometric.
