export async function onRequest(context) {
  try {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const answers = await request.json();
    const apiKey = env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const prompt = buildPrompt(answers);
    const report = await callClaude(apiKey, prompt);

    return new Response(JSON.stringify({ report }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
  if (!response.ok) throw new Error(`API ${response.status}: ${text.slice(0, 100)}`);

  const data = JSON.parse(text);
  if (!data.content?.[0]?.text) throw new Error('Invalid API response');
  return data.content[0].text;
}
