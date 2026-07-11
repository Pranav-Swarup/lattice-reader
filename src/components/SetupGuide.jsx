export default function SetupGuide({ open, onClose }) {
  if (!open) return null
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal guide" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Getting an API key</h3>
        <p className="modal-body">
          Lattice Reader is bring-your-own-key. You talk to the model provider directly —
          the key is stored in this browser and never sent anywhere else.
        </p>

        <div className="guide-grid">
          <section>
            <h4>Google Gemini <span className="tag">free tier</span></h4>
            <ol>
              <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a></li>
              <li>Sign in with any Google account.</li>
              <li>Click <b>Create API key</b>. Picking a project is optional — it will make one for you.</li>
              <li>Copy the key (starts with <code>AIza…</code>) and paste it into Settings.</li>
            </ol>
            <p className="guide-note">
              The free tier needs no billing and no credit card. It is rate-limited but
              generous enough for steady reading. <code>gemini-3.1-flash-lite</code> is the
              default here and is the cheapest, fastest model.
            </p>
          </section>

          <section>
            <h4>Anthropic Claude</h4>
            <ol>
              <li>Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>, sign in.</li>
              <li>Add credit under <b>Billing</b> (no free tier).</li>
              <li><b>API keys → Create key</b>, copy the <code>sk-ant-…</code> value.</li>
            </ol>
            <p className="guide-note">
              Claude supports prompt caching, which Lattice uses: the document is cached on the
              first question, so every later question costs a fraction of the first.
            </p>
          </section>

          <section>
            <h4>OpenAI</h4>
            <ol>
              <li><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com/api-keys</a></li>
              <li>Add credit under Billing, then <b>Create new secret key</b>.</li>
              <li>Copy the <code>sk-…</code> value.</li>
            </ol>
          </section>

          <section>
            <h4>Ollama <span className="tag">local, free</span></h4>
            <ol>
              <li>Install from <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a>, then <code>ollama pull gemma3:12b</code>.</li>
              <li>Start it so this page may call it:<br /><code>OLLAMA_ORIGINS=* ollama serve</code></li>
              <li>Pick Ollama in Settings. No key needed.</li>
            </ol>
            <p className="guide-note">
              Only works when Lattice runs on <code>http://localhost</code>. An HTTPS page cannot
              call a plain-HTTP local server.
            </p>
          </section>
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
