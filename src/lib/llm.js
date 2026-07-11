// Provider-agnostic LLM layer. BYOK, browser-direct.
// Each provider exposes: send({apiKey, model, system, messages, baseUrl}) -> {text, usage}

export const PROVIDERS = {
  gemini: {
    label: 'Google (Gemini)',
    defaultModel: 'gemini-3.1-flash-lite',
    models: ['gemini-3.1-flash-lite', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    keyHint: 'AIza...',
    async send({ apiKey, model, system, messages }) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
            generationConfig: { maxOutputTokens: 1200 },
          }),
        }
      )
      if (!res.ok) throw new Error(await errText(res))
      const data = await res.json()
      const u = data.usageMetadata || {}
      const cached = u.cachedContentTokenCount || 0
      return {
        text: (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''),
        usage: {
          inputTokens: (u.promptTokenCount || 0) - cached,
          outputTokens: u.candidatesTokenCount || 0,
          cacheReadTokens: cached,
          cacheWriteTokens: 0,
        },
      }
    },
  },

  anthropic: {
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'],
    keyHint: 'sk-ant-...',
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
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages,
        }),
      })
      if (!res.ok) throw new Error(await errText(res))
      const data = await res.json()
      const u = data.usage || {}
      return {
        text: (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n'),
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
