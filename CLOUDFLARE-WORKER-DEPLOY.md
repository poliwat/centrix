# Cloudflare Worker Deployment — Production Assessment Quiz

Your quiz backend has been upgraded to Cloudflare Workers. This removes the Vercel dependency and keeps everything on Cloudflare.

## What Changed

- **New:** `_worker.js` — Cloudflare Worker that handles `/api/assessment` POST requests
- **Updated:** `production-assessment.html` — now calls `/api/assessment` (local endpoint, no Vercel URL)
- **New:** `wrangler.toml` — Cloudflare Worker configuration
- **Removed:** Dependency on Vercel Functions

## Why This Works Better

1. **Single vendor** — Everything on Cloudflare (Pages + Workers)
2. **No cross-origin issues** — Local `/api/assessment` endpoint on same domain
3. **Simpler deployment** — `_worker.js` auto-deploys with your static site

## Deploy in 2 Steps

### Step 1: Commit & Push

Open Terminal and run:

```bash
cd ~/Documents/centrix
git status  # Should show _worker.js, production-assessment.html, wrangler.toml as modified/new
git add _worker.js production-assessment.html wrangler.toml
git commit -m "Deploy Cloudflare Worker backend for production assessment"
git push origin main
```

(If you hit a git lock error: `rm -f .git/index.lock`, then retry.)

### Step 2: Set Environment Variable in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. Open **centrix** project
3. Click **Settings** → **Environment Variables**
4. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Paste your API key from https://console.anthropic.com/api-keys
   - **Environment:** Production (and Development if you test locally)
5. Click **Save**

Cloudflare will auto-deploy your changes from GitHub within ~1 minute.

## Test It

1. Go to: `https://centrix.palebluepoliwat.workers.dev/production-assessment.html`
2. Answer all 6 questions
3. Click **Get My Report**
4. Wait ~30 seconds for the AI to generate your personalized assessment

If you get an error:
- Verify `ANTHROPIC_API_KEY` is set in Cloudflare environment variables
- Check browser console (F12 → Console) for details
- Confirm the API key is valid at https://console.anthropic.com/api-keys

## That's It

Your quiz is now live with Cloudflare Workers. No more Vercel, no more CORS headaches, just clean local API calls.

**Cost:** ~$0.0003 per quiz (~$3 per 10,000 quizzes). You only pay for what people use.
