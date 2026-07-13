import { InvertButton } from './InvertTool'

export default function MobileGate() {
  return (
    <div className="gate">
      <h1>Lattice Reader</h1>
      <p className="gate-tag">Best experienced on desktop.</p>

      <p className="gate-why">
        The whole tool is built on selecting text and hitting a key — <kbd>G</kbd> to explain a
        snippet, <kbd>A</kbd> to annotate, <kbd>H</kbd> to highlight — beside a document pane and a
        chat pane. Touch selection and a phone-sized screen can't carry that.
      </p>
      <p className="gate-why">
        On desktop you get the reader, threaded snippet explanations with the whole document as
        context, annotations, highlights, and multi-document sessions.
      </p>

      <div className="gate-tool">
        <span className="gate-tool-label">What does work here</span>
        <InvertButton />
      </div>
    </div>
  )
}
