// Provider-agnostic LLM layer. BYOK, browser-direct.
// Each provider exposes: send({apiKey, model, system, messages}) -> {text, usage}
// usage is normalized to {inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens}

export const PROVIDERS = {
  anthropic: {
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-sonnet-4-6',
    models: [
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001',
    ],
    keyHint: 'sk-ant-...',
    // Prices per million tokens (USD). Update as needed.
    pricing: {
      'claude-sonnet-4-6': { in: 3, out: 15, cacheRead: 0.3, cacheWrite: 3.75 },
      'claude-opus-4-6': { in: 15, out: 75, cacheRead: 1.5, cacheWrite: 18.75 },
      'claude-haiku-4-5-20251001': { in: 1, out: 5, cacheRead: 0.1, cacheWrite: 1.25 },
    },
    async send({ apiKey, model, system, messages }) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          // Cache the paper body so every follow-up snippet is cheap.
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages,
        }),
      })
      if (!res.ok) throw new Error(await errText(res))
      const data = await res.json()
      const u = data.usage || {}
      return {
        text: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n'),
        usage: {
          inputTokens: u.input_tokens || 0,
          outputTokens: u.output_tokens || 0,
          cacheReadTokens: u.cache_read_input_tokens || 0,
          cacheWriteTokens: u.cache_creation_input_tokens || 0,
        },
      }
    },
  },

  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
    keyHint: 'sk-...',
    pricing: {
      'gpt-4o': { in: 2.5, out: 10, cacheRead: 1.25, cacheWrite: 0 },
      'gpt-4o-mini': { in: 0.15, out: 0.6, cacheRead: 0.075, cacheWrite: 0 },
      'gpt-4.1': { in: 2, out: 8, cacheRead: 0.5, cacheWrite: 0 },
    },
    async send({ apiKey, model, system, messages }) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      })
      if (!res.ok) throw new Error(await errText(res))
      const data = await res.json()
      const u = data.usage || {}
      const cached = u.prompt_tokens_details?.cached_tokens || 0
      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: {
          inputTokens: (u.prompt_tokens || 0) - cached,
          outputTokens: u.completion_tokens || 0,
          cacheReadTokens: cached,
          cacheWriteTokens: 0,
        },
      }
    },
  },

  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'anthropic/claude-sonnet-4.5',
    models: [
      'anthropic/claude-sonnet-4.5',
      'openai/gpt-4o',
      'google/gemini-2.5-pro',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    keyHint: 'sk-or-...',
    pricing: {},
    async send({ apiKey, model, system, messages }) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      })
      if (!res.ok) throw new Error(await errText(res))
      const data = await res.json()
      const u = data.usage || {}
      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: {
          inputTokens: u.prompt_tokens || 0,
          outputTokens: u.completion_tokens || 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
      }
    },
  },

  ollama: {
    label: 'Ollama (local)',
    defaultModel: 'gemma3:12b',
    models: ['gemma3:12b', 'qwen2.5:14b', 'llama3.1:8b'],
    keyHint: 'not needed — set base URL below',
    pricing: {},
    async send({ model, system, messages, baseUrl }) {
      const url = (baseUrl || 'http://localhost:11434').replace(/\/$/, '')
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      })
      if (!res.ok) throw new Error(await errText(res))
      const data = await res.json()
      const u = data.usage || {}
      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: {
          inputTokens: u.prompt_tokens || 0,
          outputTokens: u.completion_tokens || 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
      }
    },
  },
}

async function errText(res) {
  let body = ''
  try { body = JSON.stringify(await res.json()) } catch { body = await res.text() }
  return `${res.status} ${res.statusText} — ${body.slice(0, 400)}`
}

export function estimateCost(provider, model, usage) {
  const p = PROVIDERS[provider]?.pricing?.[model]
  if (!p) return null
  const m = 1e6
  return (
    (usage.inputTokens * p.in) / m +
    (usage.outputTokens * p.out) / m +
    (usage.cacheReadTokens * (p.cacheRead ?? p.in)) / m +
    (usage.cacheWriteTokens * (p.cacheWrite ?? p.in)) / m
  )
}
