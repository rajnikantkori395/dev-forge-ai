/**
 * Verify your OpenRouter key works (same API used by `ai-assist`).
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-v1-... node scripts/test-openrouter.mjs
 * Optional:
 *   OPENROUTER_MODEL=anthropic/claude-3.5-haiku
 */
const key = process.env.OPENROUTER_API_KEY;
if (!key?.trim()) {
  console.error('Missing OPENROUTER_API_KEY in the environment.');
  process.exit(1);
}

const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat:free';

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key.trim()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://devforge.ai',
    'X-OpenRouter-Title': 'DevForge AI',
  },
  body: JSON.stringify({
    model,
    messages: [{ role: 'user', content: 'Reply with one word: ok' }],
    max_tokens: 16,
  }),
});

const body = await res.text();
console.log('HTTP', res.status);
console.log(body.slice(0, 800));
if (!res.ok) process.exit(1);
