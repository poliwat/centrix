# Centrix Score — Classification & Scoring Pipeline

This turns a **full roll-call list** into a transparent Centrix Score, instead of hand-picking 20 votes. It's built to stay **trackable, readable, and auditable**: every decision is written to a CSV you can open and challenge.

## The one design principle that matters

- **The machine decides "is this vote Centrix-relevant, and which dimension?"** — mechanical keyword matching, every trigger logged. No black box.
- **A human decides "which way is the Centrix-aligned vote?"** — that value judgment lives in `aligned_positions.csv`, in plain sight.

This is deliberate: the contestable judgment (which way is "aligned") never hides inside code or a model. A reviewer can audit the machine's triage *and* the human's calls separately.

## Files

| File | Role |
|------|------|
| `rules.json` | **The transparency core.** Dimension weights, keywords, and the procedural exclude-list. Everything that shapes a score is here in plain sight — edit and re-run. |
| `sample_rollcalls.csv` | Example roll-call list (VoteView-style schema) so it runs with no setup. |
| `aligned_positions.csv` | The **human layer** — which way is Centrix-aligned on each relevant vote, with a rationale. |
| `sample_member_votes.csv` | Synthetic archetype members (NOT real people) so scoring runs out of the box. |
| `centrix_pipeline.py` | The pipeline: classify → score → report. |
| `classified_votes.csv` | **OUTPUT / audit artifact.** Every roll call, whether it's relevant, its dimension, the exact trigger keywords, and a `needs_review` flag. |
| `centrix_scores.csv` | **OUTPUT.** Each member's 0–100 score, band, and per-dimension breakdown. |

## Run it (no network needed)

```bash
cd centrix-pipeline
python3 centrix_pipeline.py
```

You'll get a readable run report plus the two output CSVs. On the bundled sample it processes 15 roll calls, keeps 10 as Centrix-relevant, filters 5 procedural ones, and flags 2 weak matches for human review.

## Read the output

`classified_votes.csv` is the thing to inspect. Each row tells you *why*:
- `relevant` — did it map to a dimension at all?
- `dimension` / `dimension_name` — which one the machine chose.
- `trigger_keywords` — the exact words that fired (so you can argue with it).
- `needs_review` — flagged when the match is weak (single keyword), ambiguous (a tie), or the human aligned-position isn't set yet.
- `reason` — plain-English explanation.

`centrix_scores.csv` gives each member an overall 0–100, a band, and a per-dimension breakdown (great for a radar chart). A member missing >25% of scored votes is marked "insufficient record" rather than given a misleading number.

## Running on LIVE current-Congress data

The pipeline just needs two tables in a simple schema. Point it at real data:

```bash
python3 centrix_pipeline.py \
  --rollcalls live_rollcalls.csv \
  --members  live_member_votes.csv \
  --aligned  aligned_positions.csv
```

**Where to get the data (all free, public):**

- **VoteView bulk CSVs** — the easiest full-record source. Download the 119th-Congress roll-call and member files from voteview.com's data page (files like `H119_rollcalls.csv`, `S119_rollcalls.csv`, and the member-vote files). VoteView uses numeric cast codes (1–3 = Yea, 4–6 = Nay, 7–9 = Present/absent) — the loader already maps these via `VOTEVIEW_CAST`.
- **Congress.gov API** (Library of Congress) — official House roll-call votes back to 2023, member-level. Free API key by registration.
- **Senate.gov roll-call XML** — for Senate votes (Congress.gov's vote endpoints are House-only).

**Map columns to this schema:**
- `live_rollcalls.csv` → `rollcall_key, chamber, bill_number, description` (the `description`/vote text is what gets classified — VoteView's `vote_desc`/`dtl_desc` fields work well).
- `live_member_votes.csv` → `member_id, name, party, rollcall_key, cast`.

**Then do the human step:** open `classified_votes.csv`, review the flagged rows, and fill in `aligned_positions.csv` for every relevant vote you want scored. Re-run. That's the whole loop.

## Honest limitations (v1)

- **The keyword classifier is a first-pass triage, not the final word.** It's meant to shrink hundreds of votes down to the relevant subset for human review — always spot-check, and always review the `needs_review` rows. You can later swap in an LLM-assisted classifier behind the same interface; keep the output format so it stays auditable.
- **Aligned positions are value judgments.** They're supposed to be. Keep them public with rationales so people can argue the calls, not the arithmetic.
- **Omnibus votes bundle many things** — flag them (the methodology treats them as judgment calls).
- **The party-symmetry test needs real numbers.** On the tiny synthetic sample it can trip on a 2-person "party"; across a full chamber it becomes a meaningful check that the basket measures Centrix alignment, not partisanship.

---

*Part of the Centrix Score project. See `CENTRIX-SCORE-METHODOLOGY.md` for the full framework.*
