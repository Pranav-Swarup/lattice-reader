import { PROVIDERS } from '../lib/llm'

export default function Settings({ open, onClose, settings, setSettings, usage, onResetUsage }) {
  if (!open) return null
  const p = PROVIDERS[settings.provider]
  const set = (patch) => setSettings({ ...settings, ...patch })

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <label>Provider</label>
        <select
          value={settings.provider}
          onChange={(e) => {
            const id = e.target.value
            set({ provider: id, model: PROVIDERS[id].defaultModel })
          }}
        >
          {Object.entries(PROVIDERS).map(([id, v]) => (
            <option key={id} value={id}>{v.label}</option>
          ))}
        </select>

        <label>Model</label>
        <input
          value={settings.model}
          onChange={(e) => set({ model: e.target.value })}
          list="models"
        />
        <datalist id="models">
          {p.models.map((m) => <option key={m} value={m} />)}
        </datalist>

        {settings.provider === 'ollama' ? (
          <>
            <label>Ollama base URL</label>
            <input
              value={settings.ollamaUrl}
              onChange={(e) => set({ ollamaUrl: e.target.value })}
            />
            <p className="note">
              Ollama must be started with CORS allowed, e.g.
              <code>OLLAMA_ORIGINS=* ollama serve</code>
            </p>
          </>
        ) : (
          <>
            <label>API key</label>
            <input
              type="password"
              placeholder={p.keyHint}
              value={settings.keys[settings.provider] || ''}
              onChange={(e) => set({ keys: { ...settings.keys, [settings.provider]: e.target.value } })}
            />
            <p className="note">
              Stored in this browser only (localStorage). Never sent anywhere but the provider.
            </p>
          </>
        )}

        <h3>Usage this browser</h3>
        <div className="usage-grid">
          <div><span>Calls</span><b>{usage.calls}</b></div>
          <div><span>Input</span><b>{usage.inputTokens.toLocaleString()}</b></div>
          <div><span>Output</span><b>{usage.outputTokens.toLocaleString()}</b></div>
          <div><span>Cache read</span><b>{usage.cacheReadTokens.toLocaleString()}</b></div>
          <div><span>Cache write</span><b>{usage.cacheWriteTokens.toLocaleString()}</b></div>
          <div><span>Est. cost</span><b>${usage.cost.toFixed(4)}</b></div>
        </div>
        <p className="note">
          Estimated from the token counts each API response returns, using list prices. It is not your
          account balance — that needs an admin key and shouldn't live in a browser.
        </p>
        <button className="ghost" onClick={onResetUsage}>Reset counters</button>

        <button className="done" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
