export const MODES = [
  {
    id: 'define',
    label: 'Define',
    blurb: 'A glossary of every technical term in the selection.',
    instruction:
      'Do not explain the snippet as a whole. Pull out every keyword, technical term, notation ' +
      'symbol, and piece of jargon in the selection and define each in one plain sentence. Where ' +
      "the document defines or uses a term elsewhere, use the document's meaning, not the generic one. " +
      'Output a compact bulleted glossary and nothing else.',
  },
  {
    id: 'naive',
    label: 'Basic',
    blurb: 'Assumes no background. Builds the basics first.',
    instruction:
      'Assume no background in this subfield. Teach the underlying idea from the ground up before ' +
      'touching the snippet: what problem it exists to solve, what the moving parts are, why anyone ' +
      'would do it this way. Use one concrete analogy. Only then say what this snippet claims. ' +
      'Under 200 words. No jargon unless defined inline.',
  },
  {
    id: 'technical',
    label: 'Technical',
    blurb: 'You know the area. Straight to what is being said.',
    instruction:
      'Assume the reader knows the general area but has not read this document. Skip background. ' +
      "Explain precisely what this snippet does, how it connects to the document's contribution, what " +
      'the notation refers to, and any assumption it quietly relies on. If it is easy to misread, ' +
      'say so. Under 200 words.',
  },
  {
    id: 'custom',
    label: 'Custom',
    blurb: 'Your own instruction, appended to every message in this thread.',
    instruction: '',
  },
]

export const BASE_SYSTEM = (docText, range) =>
  `You are a reading companion for an academic document. The text below is the document` +
  (range ? ` (pages ${range[0]}–${range[1]} only — the reader has scoped context to this range)` : '') +
  `. The reader works through it linearly and selects short snippets to ask about.\n\n` +
  `Answer about the SELECTED SNIPPET ONLY, but use the rest of the text as context: resolve ` +
  `notation, point back to where a term was defined, connect the snippet to the argument where ` +
  `that helps. Never summarize the whole document unless asked. Be direct and concrete. Plain prose, ` +
  `minimal formatting, no preamble.\n\n` +
  `=== DOCUMENT TEXT ===\n${docText}\n=== END DOCUMENT TEXT ===`

export function buildUserTurn({ selection, mode, customInstruction, page }) {
  const m = MODES.find((x) => x.id === mode)
  const instruction = mode === 'custom'
    ? (customInstruction || 'Explain this snippet.')
    : m.instruction
  return `SELECTED SNIPPET (page ${page}):\n"""\n${selection}\n"""\n\nINSTRUCTION:\n${instruction}`
}
