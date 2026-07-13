# Lattice Reader

**Ask one thing at a time. How you want it.**

Lattice Reader is a document reader for people who read hard things slowly.

Most AI reading tools summarize the whole document at you. That is the opposite of what you want when you are actually working through a paper — you want to sit with one paragraph, understand *that*, and move on. But you also want the model to know the rest of the document, so it can tell you where a symbol was defined, what the notation refers to, and how this bit connects to the argument.

So: **select a snippet, press `G`, get an explanation of that snippet only — with the whole document as context.**

No account. No server. Your document never leaves the browser tab, and your API key never leaves your device.

---

## How it works

1. **Drop in a PDF.**
2. **Select some text** — a sentence, a paragraph, a definition, an equation.
3. **Press `G`.** A thread opens in the right-hand pane.
4. **Pick how you want it explained** (Define / Basic / Technical / Custom).
5. **Press `Enter`.**

That's the loop. Everything else is in service of it.

---

## Features

### Two explanation modes

Select a snippet, then choose the register. Nothing is sent until you hit Enter, so you can switch freely before committing.

| Mode | What it does |
|---|---|
| **Basic** | Restates the snippet in plain English — the same claim, simplest wording that's still true — then gives the intuition underneath: what's really going on, why anyone would do it this way, what breaks if they don't. Reaches for analogies, examples, and parallels. Not condescending, just plain. |
| **Define** | Skips explanation. Pulls out every technical term, symbol, and piece of jargon in the selection and defines each in one line, using the document's meaning where it has fixed one. |

Already got an answer and want it re-framed? Switch modes and hit Enter again — the thread keeps its history.

### Document mode ⇄ General mode

A switch at the top of the chat pane. In **Document** mode (default) the document is sent as context and answers are grounded in it. Flip to **General** and the document is dropped from the prompt entirely — you get a normal assistant, mid-conversation, for when you need to ask something the paper has nothing to do with. Flip back and grounding resumes.

### Editing the snippet

PDF extraction breaks ligatures, splits hyphens, and interleaves columns. Click the snippet in a thread (before you send) to open a full editing panel and fix it — asking a model about garbled text is worse than useless.

### Scoped context

The **Context pages** control sends only part of the document to the model. A 60-page paper with 40 pages of appendices costs the same per question as its 8-page core — unless you scope it. Narrowing also sharpens answers, since the model isn't hunting through supplementary material.

Locks once you open a thread, because changing it would invalidate every answer already given.

### Threads

Every snippet you ask about becomes its own thread, with full follow-up conversation. Select the same snippet (or a subset of one you've already asked about) and Lattice reopens the existing thread instead of spending another call.

You can also just **ask a general question** about the document without selecting anything.

### Highlighting and annotation

- **`H`** — highlight the selection. Five muted inks. Right-click any highlight to remove the whole chunk.
- **`A`** — annotate the selection. Notes live in a side panel; click one to jump to and highlight its location in the document.

### Reading comfort

- **Invert document** — flips the page to dark while leaving figures and photographs correct.
- **Focus mode** — collapses everything but the document.
- **Six themes** — three dark (Ember Study, Midnight Oil, Moss Cathedral), one mid-tone (Foggy Desk), two light (Paper Cut, Letterhead).
- Resizable and collapsible chat pane; vertical zoom; `Ctrl`/`Cmd` + scroll to zoom.

### Export an inverted PDF

Hover the **invert** button to reveal a download action: it produces an inverted copy of the document you can keep, for reading in other apps at night.

This is a rasterised export — every page is rendered to an image, inverted pixel by pixel (with a hue rotation, so figures stay their true colours rather than turning into negatives), and rebuilt into a new PDF. The output is therefore **image-only: no selectable text, no search, and a larger file**. That is inherent to doing it in the browser with no server. The on-screen invert, by contrast, is a live CSS filter and keeps text fully selectable.

The same tool is the only thing offered on mobile, where the app otherwise shows a "best experienced on desktop" screen — the whole interaction is text selection and keyboard shortcuts.

### Multi-document library

Documents stack in a rail on the left, each with a **fully isolated session** — its own threads, annotations, highlights, and page range. Rename or delete them from the library screen.

### Bring your own key

| Provider | Notes |
|---|---|
| **Google Gemini** | **Has a free tier.** No credit card. The default. |
| **Anthropic Claude** | Supports prompt caching — see below. |
| **OpenAI** | GPT-4o and friends. |
| **OpenRouter** | One key, many models. |
| **Ollama** | Fully local, fully free. Localhost only. |

Keys are stored in your browser's localStorage and are sent to the provider and nowhere else. There is no backend to send them to.

---

## Keyboard

| Key | Action |
|---|---|
| `G` | Explain the selected snippet |
| `A` | Annotate the selected snippet |
| `H` | Highlight the selected snippet |
| `Enter` | Send (in a thread) |
| Right-click | Remove a highlight |
| `Ctrl`/`Cmd` + scroll | Zoom the document |
| `Esc` | Close panels / exit focus mode |

---

## Getting an API key

The in-app guide (**Settings → How do I get an API key?**) walks through all providers. The short version for the free option:

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Sign in with any Google account
3. Click **Create API key**
4. Copy the `AIza…` value into Settings

No billing, no credit card. Rate-limited but generous enough for steady reading. `gemini-3.1-flash-lite` is the default and is the cheapest and fastest option.

---

## Running it

```bash
npm install
npm run dev
```

### Deploying

**GitHub Pages** — push to `main`. The included workflow builds and publishes automatically. One-time setup: **Settings → Pages → Source: GitHub Actions**. Lands at `https://<user>.github.io/<repo>/`.

The workflow sets `VITE_BASE=/<repo>/` so assets resolve under the subpath. Without it every asset 404s and the page renders blank — that's the usual Pages failure. If you attach a custom domain, set `VITE_BASE=/` instead.

**Render / Netlify / Vercel** — static site, `npm ci && npm run build`, publish `dist`. No `VITE_BASE` needed.

> **Note:** Ollama only works when Lattice is served over `http://localhost`. An HTTPS page cannot call a plain-HTTP local server.

---

## Notes on the internals

A few decisions worth knowing if you plan to modify this.

**Prompt caching is the economics.** On Anthropic, the document is sent in the system block with `cache_control: ephemeral`. The first question pays to write the cache; every question after reads it at roughly a tenth of the cost. On a 30k-token paper that's the difference between ~$0.09 and ~$0.01 per question. If you refactor the LLM layer, keep this.

**Text extraction is geometric, not stream-order.** PDF text items arrive in the order they were written to the file, which interleaves the columns of a two-column paper line by line. Lattice reconstructs reading order from the items' x/y coordinates: detect two columns, treat full-width items (title, abstract) as band separators, then read the left column top-to-bottom before the right. Feeding a model column-interleaved text quietly ruins every answer, and it's invisible unless you look.

**The text layer needs `--scale-factor`.** pdf.js v4 positions every glyph in its invisible selectable text layer using `calc(var(--scale-factor) * …)`. If that variable isn't set on an ancestor, the text layer silently misaligns with the painted canvas and selection appears to grab the wrong words. This is the single most important line in the viewer.

**Highlight geometry never touches viewport coordinates.** `range.getClientRects()` returns viewport-space rectangles that shift with scroll and warp under zoom. Instead, Lattice uses the DOM selection only to learn *which* spans and *which character offsets* are selected, and derives geometry from those spans' own `offsetLeft`/`offsetTop` — page-local coordinates that scroll and zoom cannot perturb. Partial spans are sliced proportionally by character count.

**Documents aren't persisted.** localStorage can't hold a PDF. Sessions survive a reload; the file itself must be re-dropped, and a fingerprint (name + size + first-page text) reattaches it to its saved threads.

---

## Known limits

- Math renders as inline code, not typeset. No KaTeX yet — it would drop into `Markdown.jsx` in about ten lines.
- Thread reuse is substring-based, not geometric — it won't catch a selection straddling two existing threads.
- Documents with three or more columns fall back to naive extraction.
- A selection dragged across a page boundary highlights only on the first page (the text still captures in full).

---

Made by Pranav.
