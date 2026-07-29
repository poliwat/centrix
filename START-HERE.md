# Centrix — Project Index

Everything built for the Centrix movement, in one place. Written under the pen name Saint Moses the Black.

This file is your map. Skim the four sections, open what you need. If you only read one other thing, make it **`LAUNCH-PLAN.md`**.

---

## 1. The website (this is what you publish)

A fast, static, no-build site. The deploy root must contain `index.html` plus the assets it references (all listed here).

| File | What it is |
|------|-----------|
| `index.html` | **The landing page.** Mission, philosophy, platform (left/right synthesis), leadership + founder note, FAQ, and the volunteer form. |
| `data.html` | **"The Data"** — the three century-long declines with interactive charts and sources. |
| `scorecard.html` | **The Centrix Score scorecard** — interactive profile explorer (radar), the real verified-votes basket, and provisional real-member positions. Loads `scores.csv` when served over the web. |
| `scores.csv` | Pipeline output the scorecard reads. Currently holds **synthetic sample** profiles — regenerate from real data to show real members (see section 3). |
| `favicon.svg` | Browser-tab icon. |
| `logo.svg` | Logo + wordmark for social profiles, headers, print. |
| `theme-warm.css` | Optional earthy/grassroots color scheme (one-line swap; see `README.md`). |
| `README.md` | **How to publish and edit the site** — Cloudflare Pages / Netlify / GitHub Pages, custom domain, connecting the form and Discord/Substack. |
| `centrix-party.html` | Old backup of the landing page. Safe to delete. |

> Note: `scorecard.html` reads `scores.csv` via `fetch()`, which works when the site is **served over http/https** (Cloudflare, Netlify, GitHub Pages). Opened directly from disk (`file://`) it falls back to the illustrative archetypes — that's expected.

**Start here:** open `README.md`, publish on Cloudflare Pages, point a domain at it.

---

## 2. Messaging & outreach

| File | What it is |
|------|-----------|
| `LAUNCH-PLAN.md` | **The $2,000 launch + interest-test plan.** Free foundation to set up first, budget allocation, organic strategy, 4-week timeline, and the political-ad compliance steps to start early. |
| `Centrix-Party-Handout.pdf` | One-page printable handout — the party, the three declines, the platform. |
| `handout.html` | Source for the handout PDF (edit, then print-to-PDF from Chrome). |

**Start here:** read `LAUNCH-PLAN.md` before spending a dollar.

---

## 3. The Centrix Score (accountability engine)

The score rates legislators 0–100 on how often they vote to empower citizens — orthogonal to left/right.

| File | What it is |
|------|-----------|
| `CENTRIX-SCORE-METHODOLOGY.md` | **The full framework** — 8 dimensions, weights, the 0–100 scale, pre-registration rule, and the bias controls (esp. the party-symmetry test). |
| `CENTRIX-SCORE-WORKSHEET.csv` | The vote basket — **7 real, sourced 119th-Congress votes** across 7 of 8 dimensions, plus the documented localism gap and template rows. |
| `centrix-pipeline/` | **The classification & scoring pipeline** (its own folder + README). Turns a full roll-call list into a transparent score. |

### Inside `centrix-pipeline/`

| File | Role |
|------|------|
| `README.md` | How it works + how to run on live current-Congress data. |
| `rules.json` | **The transparency core** — weights, keywords, procedural exclude-list. Everything that shapes a score, in plain sight. |
| `centrix_pipeline.py` | Runs classify → score → report. `python3 centrix_pipeline.py`. |
| `aligned_positions.csv` | The **human layer** — which way is "aligned" on each relevant vote, with rationale. |
| `classified_votes.csv` | **Audit artifact** — every vote, its dimension, the trigger keywords, and a review flag. |
| `centrix_scores.csv` | Output scores (this gets copied to `scores.csv` for the website). |
| `sample_rollcalls.csv`, `sample_member_votes.csv` | Sample data so it runs with no setup (members are synthetic). |

**To produce real scores:** download the 119th Congress roll-call + member-vote files (VoteView or Congress.gov — see the pipeline README), run the pipeline, review the flagged rows, set aligned positions, re-run. Then copy `centrix-pipeline/centrix_scores.csv` to `scores.csv` in the site root and the scorecard shows real profiles.

**Start here:** read `CENTRIX-SCORE-METHODOLOGY.md`, then `centrix-pipeline/README.md`.

---

## 4. Suggested order of operations

1. **Publish the site** (README.md → Cloudflare Pages + domain).
2. **Set up the free foundation** (LAUNCH-PLAN.md → Substack, Discord, analytics; connect the form).
3. **Start ad-platform identity verification** (needed days ahead of any paid political ads).
4. **Complete the vote basket** (add more discriminating votes to the worksheet; pre-register it).
5. **Run the pipeline on real data**, review, publish real scores → refresh `scores.csv`.
6. **Launch** the $2,000 test; measure against the plan's success metrics at week 4.

---

## One honest reminder

The credibility of all of this rests on transparency and even-handedness — publishing your methodology, sourcing every claim, praising and criticizing both parties by the same standard, and never publishing a score you can't defend from public votes. That restraint *is* the brand. Protect it.

*Centrix — an independent citizen movement, written under the pen name Saint Moses the Black. Policy ideas offered for discussion.*
