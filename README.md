# Lattice Reader

Read a paper. Select a passage, press **G**, get an explanation of *that passage only* — with the entire paper as context. Press **A** to annotate.

No backend. The PDF never leaves your tab. Your API key lives in localStorage.

## Run

```bash
npm install
npm run dev
```

## Deploy (Render)

`render.yaml` is included. New → Static Site → point at the repo. Build `npm ci && npm run build`, publish `dist`.

## How it works

- **PDF.js** renders each page to canvas with a transparent, selectable text layer on top. That's what makes selection possible at all — Chrome's built-in PDF viewer won't give you the selected text.
- **Full paper as system prompt.** On Anthropic, the paper is sent with `cache_control: ephemeral`, so the first call pays to write the cache and every subsequent snippet reads it at ~10% cost.
- **Selection reuse.** Before opening a thread, `findExistingChat` normalizes whitespace and checks whether the new selection is a substring of an already-answered one. If so it just reopens that thread instead of burning a call.
- **Dark paper** is a CSS `invert(1) hue-rotate(180deg)` on the canvas. Figures and photos come out roughly correct because hue-rotate undoes the color flip; only luminance is inverted.

## Modes

| Mode | What it appends |
|---|---|
| Define | Glossary of every technical term in the selection, using the paper's own meanings |
| Ground up | Assumes zero background; teaches the underlying idea first, with an analogy |
| Technical | Assumes you know the area; goes straight to what the passage is doing and what it's quietly assuming |
| Custom | Whatever you type, appended to every message in that thread |

## Providers

Anthropic, OpenAI, OpenRouter, Ollama. Ollama needs CORS: `OLLAMA_ORIGINS=* ollama serve`.

## Usage meter

Token counts come from the `usage` object in each API response and accumulate in localStorage; cost is estimated against list prices in `src/lib/llm.js`. This is *not* your account balance — that needs an admin key, which shouldn't be in a browser.

## Known gaps (deliberate, it's an MVP)

- Text extraction is naive `getTextContent()`. Two-column papers will interleave. Fix later with x/y-aware reflow.
- Markdown in responses renders as plain text.
- Selection reuse is substring-based, not geometric. It won't catch a selection that overlaps two existing threads.
- No PDF for equations — LaTeX in the text layer comes out as garbage glyphs on some papers.
