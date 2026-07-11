import { PROVIDERS } from '../lib/llm'
import { THEMES } from '../lib/themes'
import { useState } from 'react'
import SetupGuide from './SetupGuide'

export default function Settings({ open, onClose, settings, setSettings, usage, onResetUsage }) {
  if (!open) return null
  const p = PROVIDERS[settings.provider]
  const set = (patch) => setSettings({ ...settings, ...patch })
  const [guide, setGuide] = useState(false)
  const ti = Math.max(0, THEMES.findIndex((t) => t.id === settings.theme))
  const cycle = (d) => set({ theme: THEMES[(ti + d + THEMES.length) % THEMES.length].id })

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <label>Provider</label>
        <select
          value={settings.provider}
          onChange={(e) => set({ provider: e.target.value, model: PROVIDERS[e.target.value].defaultModel })}
        >
          {Object.entries(PROVIDERS).map(([id, v]) => (
            <option key={id} value={id}>{v.label}</option>
          ))}
        </select>

        <label>Model</label>
        <input value={settings.model} list="models" onChange={(e) => set({ model: e.target.value })} />
        <datalist id="models">
          {p.models.map((m) => <option key={m} value={m} />)}
        </datalist>

        <button className="ghost guide-btn" onClick={() => setGuide(true)}>
          How do I get an API key?
        </button>

        {settings.provider === 'ollama' ? (
          <>
            <label>Ollama base URL</label>
            <input value={settings.ollamaUrl} onChange={(e) => set({ ollamaUrl: e.target.value })} />
            <p className="note">Start Ollama with CORS allowed: <code>OLLAMA_ORIGINS=* ollama serve</code></p>
          </>
        ) : (
          <>
            <label>API key</label>
            <input
              type="password"
              placeholder="This does not leave your device"
              value={settings.keys[settings.provider] || ''}
              onChange={(e) => set({ keys: { ...settings.keys, [settings.provider]: e.target.value } })}
            />
            <p className="note">This does not leave your device.</p>
          </>
        )}

        <h3>This browser's usage</h3>
        <div className="usage-grid">
          <div><span>Calls</span><b>{usage.calls}</b></div>
          <div><span>Input</span><b>{usage.inputTokens.toLocaleString()}</b></div>
          <div><span>Output</span><b>{usage.outputTokens.toLocaleString()}</b></div>
          <div><span>Cache read</span><b>{usage.cacheReadTokens.toLocaleString()}</b></div>
          <div><span>Cache write</span><b>{usage.cacheWriteTokens.toLocaleString()}</b></div>
        </div>
        <p className="note">
          Counted from the token totals each API response returns.
        </p>
        <button className="ghost" onClick={onResetUsage}>Reset counters</button>

        <h3>Appearance</h3>
        <label>Theme</label>
        <div className="carousel">
          <button onClick={() => cycle(-1)} aria-label="Previous theme">‹</button>
          <div className="carousel-face">
            <span className="carousel-name">{THEMES[ti].name}</span>
            <span className="carousel-mode">{THEMES[ti].dark ? 'dark' : 'light'}</span>
            <div className="swatches">
              {['--bg-3', '--clay', '--sage', '--blue', '--wheat'].map((k) => (
                <i key={k} style={{ background: THEMES[ti].vars[k] }} />
              ))}
            </div>
          </div>
          <button onClick={() => cycle(1)} aria-label="Next theme">›</button>
        </div>


        <p className="sig">made by pranav :)</p>
      </div>
      <SetupGuide open={guide} onClose={() => setGuide(false)} />
    </div>
  )
}
