/**
 * Catch-all Pages Function for Centrix
 * Handles /api/assessment POST requests
 * Passes everything else to static files
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Handle /api/assessment
  if (url.pathname === '/api/assessment') {
    return await handleAssessment(request, env);
  }

  // Everything else goes to Pages (static files)
  return context.next();
}

async function handleAssessment(request, env) {
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

  if (request.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }

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
    console.error('Assessment error:', err);
    return json({ error: err.message }, 500);
  }
}

function buildPrompt(answers) {
  const skillsDetail = answers.skillsDetails || answers.skills || 'unspecified';
  const region = answers.region || 'unspecified region';

  return `You are a production & entrepreneurship advisor for Centrix, a movement focused on empowering citizens to produce and prosper locally.

A person answered a "Production Assessment" quiz. Write a personalized report.

**Profile:**
- Geography: ${answers.geography} (${region})
- Skills: ${answers.skills}
- Specific skills: ${skillsDetail}
- Capital: ${answers.capital}
- Time commitment: ${answers.time}
- Growth goal: ${answers.growth}
- Competitive advantage: ${answers.advantage}

**Structure:**
1. **Personal Production Profile** (2-3 sentences, give it an encouraging specific name)
2. **Why This Works For You** (3-4 bullet points on their advantages)
3. **2-3 Production Ideas** (specific to their region, skills, capital, and goals)
4. **First 30 Days Roadmap** (3-5 concrete action steps)
5. **Why This Is Centrix** (2-3 sentences on alignment with Centrix values)

**Tone:** Encouraging but realistic. Specific about money, time, effort. No platitudes.

**Format:** HTML with <h3> for sections, <p> for paragraphs, <ul>/<li> for lists. ~1000-1200 words.

Generate the report now.`;
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
  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = JSON.parse(text);
  if (!data.content?.[0]?.text) {
    throw new Error('Invalid Claude response structure');
  }
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
