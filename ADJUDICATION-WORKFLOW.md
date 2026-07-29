# Scaling the Centrix Score — the adjudication workflow

How to grow from ~13 key votes to a deep, multi-year record **without** drowning in manual work or hiding the judgment inside a model.

## The problem
Twenty years of Congress is roughly **18,000 roll calls**. Every scored vote needs a human-defined "Centrix-aligned position," and you can't read 18,000 votes by hand. But you also can't let an algorithm secretly decide alignment — the credibility of the whole project rests on the judgment being visible and arguable.

## The answer: a hybrid, with the human as the authority
Two roles, kept strictly separate:

- **The machine proposes** — it reads every vote, decides which are Centrix-*relevant* and to which *dimension* (mechanical keyword triage, fully logged), and can *optionally* suggest a Yea/Nay with a one-line reason.
- **You decide** — you review the proposals and approve the *aligned position*. Nothing is scored until you've put it in the seed with a position you chose.

This keeps full coverage *possible* while keeping every scored judgment *visible*.

## The pieces
| File | Role |
|------|------|
| `aligned_seed.csv` | **The published backbone** — your curated key votes, each with congress, bill, dimension, aligned position, and rationale. This is the transparent core. |
| `propose_adjudications.py` | **The discovery layer** — turns a big multi-year pull into a short review queue of relevant votes (`proposed_adjudications.csv`). Optional LLM suggestions. |
| `map_aligned.py` | Matches your seed to the real roll-call numbers in the fetched data (now congress-aware). |
| `centrix_pipeline.py` | Classifies, scores, ranks, and writes everything (now with bill + roll-call links). |

## The loop
1. **Fetch a range.** `python3 fetch_voteview.py --congresses 109-119` (start smaller, e.g. `117-119`, to test).
2. **Discover candidates.** `python3 propose_adjudications.py --passage-only` → review queue, grouped by dimension, with the thin dimensions surfaced for you. (Add `--llm` with an `ANTHROPIC_API_KEY` to get suggested positions — still review them.)
3. **Adjudicate.** Open `proposed_adjudications.csv`, keep the votes you agree with, and append the approved rows to `aligned_seed.csv` (`congress, bill_number, centrix_aligned_position, prefer_desc_contains, dimension, rationale`). Aim to keep the left/right balance even.
4. **Match + score.** `python3 map_aligned.py` then run the pipeline with `--aligned aligned_positions.mapped.csv`.
5. **Check balance.** Read the party-symmetry test. Rebalance if a party clusters. Re-run.

## Integrity rules that don't change at scale
- **Pre-register.** Freeze and publish the basket before computing who it makes look good or bad.
- **Publish every rationale.** Each aligned position ships with its reason; anyone can argue a specific call.
- **Balance the aligned positions** across left- and right-coded votes; the party-symmetry test is your check.
- **Never publish an LLM-suggested position you haven't personally reviewed.** The model is a research assistant, not the scorekeeper.

## Two honest notes
- **Lifetime scores must show their weight.** A member scored on 4 votes and one scored on 90 are not equally solid — always display the vote count (the pipeline already tracks `votes_cast` / `votes_missed`, and flags thin records as "insufficient").
- **Old votes can be judgment calls.** The eight dimensions are perennial, but occasionally the "Centrix side" of a 2007 vote is genuinely debatable. That's fine — publish the reasoning and let people push back.

---
*Part of the Centrix Score project — see `CENTRIX-SCORE-METHODOLOGY.md` and `centrix-pipeline/README.md`.*
