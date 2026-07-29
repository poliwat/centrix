/**
 * Centrix Production Assessment Handler
 * Receives quiz answers, calls Claude API, returns personalized report
 *
 * Deploy: This file is a Cloudflare Pages Function.
 * It's automatically deployed when you push to Cloudflare.
 * Requires: ANTHROPIC_API_KEY environment variable in Cloudflare Pages settings
 */

export async function onRequest(context) {
  // Only POST allowed
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const answers = await context.request.json();

    // Validate we got answers
    if (!answers.geography || !answers.skills) {
      return new Response(
        JSON.stringify({ error: 'Incomplete assessment data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt from answers
    const prompt = buildPrompt(answers);

    // Call Claude API
    const report = await callClaude(apiKey, prompt);

    return new Response(
      JSON.stringify({ report }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('Assessment error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to generate report: ' + err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function buildPrompt(answers) {
  const skillsDetail = answers.skillsDetails || answers.skills || 'unspecified';
  const region = answers.region || 'unspecified region';

  return `You are a production & entrepreneurship advisor for Centrix, a movement focused on empowering citizens to produce and prosper locally.

A person just answered a "Production Assessment" quiz about their situation. Based on their answers, write a personalized, actionable report that helps them identify a path to building income in their local economy.

**Their Profile:**
- Geography: ${answers.geography} (${region})
- Skills: ${answers.skills}
- Specific skills/experience: ${skillsDetail}
- Capital available: ${answers.capital}
- Time commitment: ${answers.time}
- Growth goal: ${answers.growth}
- Competitive advantage: ${answers.advantage}

**Your report should:**

1. Start with a **Personal Production Profile** (2–3 sentences) that captures their unique combination of skills, location, and constraints. Give it an encouraging, specific name (e.g., "The Local Specialist" or "The Craftsperson's Path").

2. Include a **Why This Works For You** section (3–4 bullet points) that explains their specific advantages given their situation (Amish-inspired: low overhead, local reputation, sustainable scale, etc.).

3. Suggest **2–3 concrete production ideas** tailored to their geography, skills, and capital. Each idea should:
   - Be specific to their region/community type (rural ≠ urban)
   - Leverage their existing skills
   - Be realistic given their capital and time constraints
   - Fit their growth goal (sustainable solo vs. scaling)
   - Have a clear local demand (not theoretical)

4. For the top idea, provide a **First 30 Days Roadmap** with 3–5 concrete steps they can take immediately.

5. End with a section called **Why This Is Centrix** (2–3 sentences) explaining how their path aligns with Centrix values: producing things of real value locally, building reputation, keeping money in community, creating genuine wealth.

**Tone:** Encouraging but realistic. Assume they're smart, skeptical, and have limited resources. Avoid platitudes. Be specific about money, time, and effort. Acknowledge constraints honestly.

**Format:** Use HTML with <h3> for subsections, <p> for paragraphs, <ul>/<li> for lists. Keep it readable, about 1,000–1,200 words.

Generate the report now.`;
}

async function callClaude(apiKey, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const report = data.content[0].text;

  // Wrap in minimal HTML if not already formatted
  if (!report.includes('<h3>')) {
    return '<p>' + report.replace(/\n\n/g, '</p><p>') + '</p>';
  }

  return report;
}
