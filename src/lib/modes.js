export const MODES = [
  {
    id: 'define',
    label: 'Define',
    blurb: 'Glossary of every technical term in the selection.',
    instruction:
      'Do not explain the passage as a whole. Instead, pull out every keyword, technical term, ' +
      'notation symbol, and piece of jargon that appears in the selection, and define each one ' +
      'in a single plain sentence. Where the paper itself defines or uses the term elsewhere, ' +
      'use the paper\'s meaning, not the generic one. Output a compact bulleted glossary and nothing else.',
  },
  {
    id: 'naive',
    label: 'Ground up',
    blurb: 'Assumes you know nothing. Builds the basics first.',
    instruction:
      'Assume the reader has no background in this subfield. Teach the underlying idea from the ' +
      'ground up before you touch the passage itself: what problem it exists to solve, what the ' +
      'moving parts are, and why anyone would do it this way. Use a concrete analogy. Only then ' +
      'say what this specific passage is claiming. Keep it under 200 words. No jargon unless you define it inline.',
  },
  {
    id: 'technical',
    label: 'Technical',
    blurb: 'You know the basics. Straight to what is actually being said.',
    instruction:
      'Assume the reader is comfortable with the general area but has not read this paper. Skip the ' +
      'background. Explain precisely what this passage is doing, how it connects to the paper\'s ' +
      'contribution, what the notation refers to, and any assumption it is quietly relying on. ' +
      'If the passage is doing something non-obvious or is easy to misread, say so. Under 200 words.',
  },
  {
    id: 'custom',
    label: 'Custom',
    blurb: 'Your own instruction, appended to every message in this chat.',
    instruction: '',
  },
]

export const BASE_SYSTEM = (paperText) =>
  `You are a reading companion for an academic paper. The full text of the paper is below. ` +
  `The reader is working through it linearly and will select short passages to ask about. ` +
  `Always answer about the SELECTED PASSAGE ONLY, but use the rest of the paper as context — ` +
  `resolve notation, refer back to where a term was defined, and connect the passage to the paper's ` +
  `overall argument where that helps. Never summarize the whole paper unless asked. Be direct and ` +
  `concrete. Plain prose, minimal formatting, no preamble.\n\n` +
  `=== FULL PAPER TEXT ===\n${paperText}\n=== END PAPER TEXT ===`

export function buildUserTurn({ selection, mode, customInstruction, page }) {
  const m = MODES.find((x) => x.id === mode)
  const instruction = mode === 'custom' ? customInstruction || 'Explain this passage.' : m.instruction
  return (
    `SELECTED PASSAGE (page ${page}):\n"""\n${selection}\n"""\n\n` +
    `INSTRUCTION:\n${instruction}`
  )
}
