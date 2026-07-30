/**
 * Cloudflare Worker for Centrix Production Assessment
 * Handles /api/assessment endpoint
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle /api/assessment POST
    if (url.pathname === '/api/assessment') {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      if (request.method === 'POST') {
        return await handleAssessment(request, env);
      }

      return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    // For everything else, return 404
    return new Response('Not found', { status: 404 });
  },
};

async function handleAssessment(request, env) {
  try {
    const answers = await request.json();
    const apiKey = env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    const prompt = buildPrompt(answers);
    const report = await callClaude(apiKey, prompt);

    return json({ report }, 200);
  } catch (err) {
    console.error('Error:', err);
    return json({ error: err.message }, 500);
  }
}

function buildPrompt(answers) {
  const skillsDetail = answers.skillsDetails || answers.skills || 'unspecified';
  const region = answers.region || 'unspecified region';
  return `You are a production & entrepreneurship advisor for Centrix.

A person answered a "Production Assessment" quiz. Based on their answers, write a personalized report.

**Their Profile:**
- Geography: ${answers.geography} (${region})
- Skills: ${answers.skills}
- Specific skills: ${skillsDetail}
- Capital: ${answers.capital}
- Time: ${answers.time}
- Growth goal: ${answers.growth}
- Advantage: ${answers.advantage}

Write a report with:
1. Personal Production Profile (encouraging name, 2-3 sentences)
2. Why This Works For You (3-4 bullet points)
3. 2-3 concrete production ideas (specific to their region/skills/capital)
4. First 30 Days Roadmap (3-5 steps)
5. Why This Is Centrix (2-3 sentences)

Format as HTML with <h3>, <p>, <ul>/<li>. About 1000-1200 words.`;
}

async function callClaude(apiKey, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`API ${response.status}: ${text.slice(0, 150)}`);

  const data = JSON.parse(text);
  if (!data.content?.[0]?.text) throw new Error('Invalid response');
  return data.content[0].text;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
