# Production Assessment — Setup & Deployment

Your Centrix site now has an interactive **Production Assessment** quiz. This guide walks you through deploying it.

## Files added
- `production-assessment.html` — the quiz UI (go live with the site)
- `functions/centrix-assessment.js` — backend handler (Cloudflare Pages Function)
- Link added to homepage nav: "Start Producing"

## What it does
1. User answers 6 questions about their skills, location, capital, time, and goals
2. Answers are sent to your backend (runs on Cloudflare)
3. Backend calls Claude API with a custom prompt
4. Claude generates a personalized "Production Assessment" report
5. User sees the report on their screen + can share it

## Deployment in 3 steps

### Step 1: Get your Anthropic API key

1. Go to https://console.anthropic.com/
2. Sign in (create account if needed)
3. Click **API Keys** in the left menu
4. Click **Create Key**
5. Copy the key (looks like `sk-ant-...`)
6. Keep it safe — don't share it

### Step 2: Set the API key in Cloudflare Pages

1. Go to your Cloudflare dashboard → **Workers & Pages**
2. Open your **centrix** project
3. Click **Settings** (or **Settings & Deployments** → **Environment variables**)
4. Scroll down to **Environment Variables**
5. Click **Add variable** (or **Edit variables**)
6. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Paste your API key from Step 1
   - **Environment:** Production (and Development if you want to test)
7. Click **Save** (or **Deploy**)

### Step 3: Deploy the new files

**Option A: Via command line (Path A from GO-LIVE.md)**
```bash
cd ~/Documents/centrix
wrangler pages deploy . --project-name centrix
```

**Option B: Via Cloudflare dashboard (Path B from GO-LIVE.md)**
1. Go to Cloudflare dashboard → **Workers & Pages** → **centrix**
2. Click **Create deployment** (or **Upload**)
3. Drag the entire `centrix` folder contents into the upload box
4. Deploy

## Verify it works

1. Go to your site: `https://centrix.palebluepoliwat.workers.dev/production-assessment.html`
2. Answer all 6 questions
3. Click **Get My Report**
4. Wait ~30 seconds for the AI to generate the report
5. You should see a personalized assessment

If you get an error:
- Check that `ANTHROPIC_API_KEY` is set in Cloudflare Pages environment variables
- Make sure the API key is valid (test it on console.anthropic.com)
- Check browser console (F12 → Console) for error messages

## How much does this cost?

Claude API pricing is super cheap:
- ~$0.0003 per quiz completion (input + output)
- 1,000 quizzes ≈ $0.30
- 10,000 quizzes ≈ $3

You only pay for what people use. Set spending limits in your Anthropic account if you want.

## Customizing the quiz

To change the questions or the report format:
1. Edit `production-assessment.html` — change the section questions/options
2. Edit `functions/centrix-assessment.js` — modify the `buildPrompt()` function to change what gets sent to Claude, or change the system prompt itself

Example: if you want the report to focus on "seasonal production" for a farm community, edit the prompt in `buildPrompt()` to emphasize that.

## Next steps

- Share the link: `production-assessment.html`
- A/B test the quiz questions (what makes people more likely to actually start?)
- Collect anonymized data: store quiz answers + results in a database (optional, adds complexity)
- Add email capture: "Email me a copy of this report" (requires a backend, or use Formspree)

---

**Questions?** Check `GO-LIVE.md` for deployment troubleshooting, or reach out if the Claude API call isn't working.
