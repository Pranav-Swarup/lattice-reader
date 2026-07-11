export const MODES = [
  {
    id: 'define',
    label: 'Define',
    blurb: 'A glossary of every technical term in the selection.',
    instruction:
      'Do not explain the passage as a whole. Pull out every keyword, technical term, notation ' +
      'symbol, and piece of jargon in the selection and define each in one plain sentence. Where ' +
      "the paper defines or uses a term elsewhere, use the paper's meaning, not the generic one. " +
      'Output a compact bulleted glossary and nothing else.',
  },
  {
    id: 'naive',
    label: 'Basic',
    blurb: 'Assumes no background. Builds the basics first.',
    instruction:
      'Assume no background in this subfield. Teach the underlying idea from the ground up before ' +
      'touching the passage: what problem it exists to solve, what the moving parts are, why anyone ' +
      'would do it this way. Use one concrete analogy. Only then say what this passage claims. ' +
      'Under 200 words. No jargon unless defined inline.',
  },
  {
    id: 'technical',
    label: 'Technical',
    blurb: 'You know the area. Straight to what is being said.',
    instruction:
      'Assume the reader knows the general area but has not read this paper. Skip background. ' +
      "Explain precisely what this passage does, how it connects to the paper's contribution, what " +
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

export const BASE_SYSTEM = (paperText, range) =>
  `You are a reading companion for an academic paper. The text below is the paper` +
  (range ? ` (pages ${range[0]}–${range[1]} only — the reader has scoped context to this range)` : '') +
  `. The reader works through it linearly and selects short passages to ask about.\n\n` +
  `Answer about the SELECTED PASSAGE ONLY, but use the rest of the text as context: resolve ` +
  `notation, point back to where a term was defined, connect the passage to the argument where ` +
  `that helps. Never summarize the whole paper unless asked. Be direct and concrete. Plain prose, ` +
  `minimal formatting, no preamble.\n\n` +
  `=== PAPER TEXT ===\n${paperText}\n=== END PAPER TEXT ===`

export function buildUserTurn({ selection, mode, customInstruction, page }) {
  const m = MODES.find((x) => x.id === mode)
  const instruction = mode === 'custom'
    ? (customInstruction || 'Explain this passage.')
    : m.instruction
  return `SELECTED PASSAGE (page ${page}):\n"""\n${selection}\n"""\n\nINSTRUCTION:\n${instruction}`
}
