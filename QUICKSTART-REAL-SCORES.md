# Quickstart: fix the deploy + put real data on the scorecard

Two parts: (A) get the whole site actually serving, (B) generate a real `scores.csv`.

---

## A. Fix the deployment (why the scorecard 404s)

Right now only `index.html` is live — `/scorecard.html` and `/scores.csv` return 404. That means the upload put your files somewhere other than the site root (usually because the *folder itself* was uploaded, so everything landed under a `centrix/` subpath instead of at `/`).

**Fix — re-upload the folder's _contents_, not the folder:**

1. In Cloudflare, open your project → **Create a new deployment** (or make a fresh Pages/Workers project).
2. When it asks for files, open the `centrix` folder, **select everything inside it** (`index.html`, `data.html`, `scorecard.html`, `scores.csv`, `favicon.svg`, the `centrix-pipeline` folder, etc.) and upload *those*. Do **not** drag the enclosing `centrix` folder.
3. Deploy, then verify these load:
   - `…/scorecard.html`  → the scorecard page
   - `…/scores.csv`      → raw CSV text

**Even more reliable (recommended): connect a GitHub repo.**
Push the *contents* of `centrix` to the repo root, then in Cloudflare choose **Connect to Git** instead of uploading. Every future change (like a new `scores.csv`) deploys automatically when you push — no re-uploading.

> If pages load but links to `/scorecard.html` still 404, your project is stripping `.html`. Either link without the extension, or set the static-assets `html_handling` to serve exact paths. GitHub + Pages avoids this.

**Confirm the scorecard works:** open `…/scorecard.html`. You should see the radar and the votes table. The dropdown will show the six sample members (Rep. A. Champion, etc.) until you do Part B.

---

## B. Generate a real `scores.csv`

The mechanical data pull is automated; the one human step (deciding which way is "Centrix-aligned") stays manual on purpose — that's what keeps the score honest.

All commands run inside the `centrix-pipeline` folder.

### 1. Pull the real votes (VoteView, free)

```bash
cd centrix-pipeline
python3 fetch_voteview.py --congress 119
```

This writes `live_rollcalls.csv` and `live_member_votes.csv` (House + Senate of the 119th Congress), now including auto-generated **bill** and **roll-call links**.

*Want history?* Pull a multi-year range instead — e.g. `python3 fetch_voteview.py --congresses 109-119` for ~20 years. See `ADJUDICATION-WORKFLOW.md` for how to scale the basket to match (it includes a discovery tool, `propose_adjudications.py`, that surfaces relevant votes to review). Start with a small range like `117-119` the first time.

### 2. Classify

```bash
python3 centrix_pipeline.py \
  --rollcalls live_rollcalls.csv \
  --members  live_member_votes.csv \
  --aligned  aligned_positions.csv
```

Open **`classified_votes.csv`**. This is your audit list: every real vote, whether it's Centrix-relevant, which dimension, and the keywords that triggered it. Skim the `needs_review` rows.

### 3. Auto-seed the seven verified votes

```bash
python3 map_aligned.py
```

This reads your fetched roll calls plus the pre-filled `aligned_seed.csv`, finds the matching roll call for each of the seven verified votes, and writes **`aligned_positions.mapped.csv`**. Rows printed as `OK` matched cleanly; rows printed as `CONFIRM` had more than one candidate (the alternatives are listed) — open the file and make sure it picked the right **passage** vote (not a procedural one). This does the tedious part for you; you only confirm.

### 4. Add more votes (the human step)

To count more than the starter seven, add rows to `aligned_positions.mapped.csv` using `rollcall_key` values from `classified_votes.csv`:

```
rollcall_key,centrix_aligned_position,set_by,rationale
H412,Yea,you,"Apprenticeship expansion — dim 1"
```

Only votes listed here get scored. Keep the left/right balance even.

### 5. Score

```bash
python3 centrix_pipeline.py --rollcalls live_rollcalls.csv \
  --members live_member_votes.csv --aligned aligned_positions.mapped.csv
```

Writes three things and runs the party-symmetry check:
- **`centrix_scores.csv`** — full per-member detail (used by the scorecard's radar).
- **`centrix_ranking.csv`** — a clean **name → score** list, sorted high to low, grouped by chamber. This is your leaderboard.
- a printed leaderboard in the terminal.

A member missing >25% of your scored votes is marked "insufficient record."

### 6. Publish

```bash
cp centrix_scores.csv ../scores.csv
cp scored_votes.csv  ../scored_votes.csv
```

Then redeploy (push to GitHub, or re-upload). The scorecard's dropdown now shows real members with real radars, and the "Votes in the scored basket" table fills in with clickable **bill** and **roll-call** links.

> **Tip — trim the list.** A full congress is 500+ members, so the dropdown gets long. For launch, open `scores.csv` and keep only the members you want to feature (a dozen well-known names is plenty). The file is just rows — delete the rest.

---

## Reality check

- The **fetch + classify + score** steps take minutes.
- The **adjudication** (step 3) is the real work and the whole point — decide it deliberately, keep the rationales public, and keep the left/right balance the methodology describes. Start with ~15–25 votes; you don't need hundreds.
- Never publish a member's number you can't defend from the public votes in your list.

*See `CENTRIX-SCORE-METHODOLOGY.md` for the full framework and `centrix-pipeline/README.md` for pipeline details.*
