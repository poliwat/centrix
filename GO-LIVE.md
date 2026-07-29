# Getting Centrix live (and updating it) — the clear version

Your earlier 404s had one cause: **only `index.html` got uploaded.** So the single rule is:

> **Always publish the WHOLE folder's contents — never one file.**

Pick one of the two paths below and stick with it.

---

## Path A — One command every time (best, once set up)

This deploys your whole `centrix` folder to Cloudflare with a single command. No dragging, no nesting mistakes, and it's fast to repeat every time you regenerate `scores.csv`.

**One-time setup:**
1. Install Node (which includes `npm`) from https://nodejs.org (LTS version).
2. In Terminal:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
   (`wrangler login` opens your browser to authorize Cloudflare — click Allow.)

**Every time you want to publish:**
```bash
cd ~/Documents/centrix
wrangler pages deploy . --project-name centrix
```
That uploads everything in the folder and prints your live URL. Done. To update after changing files, run that same one line again.

---

## Path B — Drag-and-drop in the dashboard (no install)

Simple, but you do it by hand each time.

1. Go to the Cloudflare dashboard → **Workers & Pages**.
2. Open your **centrix** project → **Create deployment** (or **Upload**).
3. When it asks for files: open your `centrix` folder, **select everything inside it** (Cmd+A), and drag those in. **Do not** drag the folder icon itself, and **do not** upload just `index.html`.
4. Click **Deploy**.

---

## Verify it worked (30 seconds)

Open these two URLs on your live site. **Both must load:**
- `…/scorecard.html`  → the scorecard page (not blank, not 404)
- `…/scores.csv`      → raw CSV text

If `scorecard.html` 404s, the upload didn't include everything — redo it and make sure all files went up.

---

## When you regenerate scores (the update loop)

After a pipeline run, copy the two data files to the site folder, then redeploy:
```bash
cp ~/Documents/centrix/centrix-pipeline/centrix_scores.csv ~/Documents/centrix/scores.csv
cp ~/Documents/centrix/centrix-pipeline/scored_votes.csv  ~/Documents/centrix/scored_votes.csv
cd ~/Documents/centrix && wrangler pages deploy . --project-name centrix
```
(That's Path A. On Path B, just re-drag the folder's contents.)

---

## Custom domain (optional, later)

In your Pages project → **Custom domains** → add a domain you own (a `.org` is ~$10–15/yr). Cloudflare handles HTTPS automatically.

---

**The whole thing in one sentence:** put the *entire* `centrix` folder up (Path A: `wrangler pages deploy .`), then check that `/scorecard.html` loads.
