/**
 * Centrix — Cloudflare Worker (Workers Assets model)
 *
 * This project deploys with `npx wrangler deploy` as a WORKER with static
 * assets — not as Cloudflare Pages. That means the `functions/` directory is
 * never used. All server-side code must live here.
 *
 * Routing: static assets are matched first. Anything with no matching file
 * (e.g. /api/assessment) falls through to this Worker.
 */

const MODEL = 'claude-sonnet-5';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/assessment') {
      if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      return handleAssessment(request, env);
    }

    // Health check — visit /api/health in a browser to confirm the Worker is live.
    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        worker: 'centrix',
        hasApiKey: Boolean(env.ANTHROPIC_API_KEY),
        assetsBound: Boolean(env.ASSETS),
        model: MODEL,
      });
    }

    // Fallback to static files.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

async function handleAssessment(request, env) {
  try {
    const answers = await request.json();

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'ANTHROPIC_API_KEY is not bound to this Worker.' }, 500);
    }

    const report = await callClaude(env.ANTHROPIC_API_KEY, buildPrompt(answers));
    return json({ report });
  } catch (err) {
    return json({ error: err.message || 'Unknown error' }, 500);
  }
}

function buildPrompt(a) {
  const skillsDetail = a.skillsDetails || a.skills || 'unspecified';
  const region = a.region || 'unspecified region';

  return `You are a production & entrepreneurship advisor for Centrix, a movement focused on empowering citizens to produce and prosper locally.

A person just answered a "Production Assessment" quiz. Write them a personalized, actionable report on building income in their local economy.

Their profile:
- Geography: ${a.geography} (${region})
- Skill category: ${a.skills}
- Specific skills: ${skillsDetail}
- Capital available: ${a.capital}
- Time commitment: ${a.time}
- Growth goal: ${a.growth}
- Competitive advantage: ${a.advantage}

Structure the report as:
1. Personal Production Profile — 2-3 sentences, with an encouraging specific name for their path.
2. Why This Works For You — 3-4 bullets on their real advantages (Amish-inspired: low overhead, local reputation, sustainable scale, shared resources).
3. Two or three concrete production ideas — specific to their community type, leveraging their skills, realistic for their capital and time, fitting their growth goal, with clear local demand.
4. First 30 Days Roadmap for the top idea — 3-5 concrete steps.
5. Why This Is Centrix — 2-3 sentences tying their path to producing real value locally, building reputation, and keeping money in the community.

Tone: encouraging but realistic. Assume they are smart, skeptical, and short on resources. Be specific about money, time, and effort. Acknowledge constraints honestly. No platitudes.

Output HTML only — <h3> for section headings, <p> for paragraphs, <ul>/<li> for lists. No markdown, no code fences, no preamble. Around 1000-1200 words.`;
}

async function callClaude(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Claude API ${res.status}: ${raw.slice(0, 300)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Claude API returned non-JSON: ${raw.slice(0, 200)}`);
  }

  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Claude API response had no text content.');
  return text;
}

function json(data, status = 200) {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
