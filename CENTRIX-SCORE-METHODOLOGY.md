# The Centrix Score — Methodology (v1.0 draft)

*A transparent, non-partisan rating of how often a legislator votes to empower ordinary citizens to produce and prosper — regardless of left or right.*

**By Saint Moses the Black (pen name) · Centrix, an independent citizen movement · Draft for public comment**

---

## 1. What the Centrix Score is (and isn't)

The Centrix Score is a number from **0 to 100** that answers one question for each member of Congress:

> *When given the chance to vote, how often did this person side with empowering ordinary Americans to produce, own, and prosper — and protect their freedom to do so?*

It is **not** a left-right rating. Political scientists already measure that (DW-NOMINATE and similar). The whole point of Centrix is that the decisive axis is a *different* one. A vote to cut red tape on local manufacturing, expand apprenticeships, make homebuilding easier, tame the cost of essentials, or stay out of a foreign war can score Centrix-positive whether it came from a progressive or a conservative. **The score is designed to be orthogonal to party** — and we prove that with the safeguards in Section 7.

Three things this score is **not**:
- It is **not** a measure of whether someone is a good or bad person.
- It is **not** a claim about motives — only about recorded votes.
- It is **not** a partisan endorsement. By design it should praise and criticize *both* parties.

---

## 2. The eight scoring dimensions

Every scored vote maps to exactly one of these dimensions, drawn directly from the Centrix platform. The first three correspond to the **"three declines"** the movement exists to reverse, and carry extra weight (Section 5).

| # | Dimension | The Centrix question a vote is judged against | Weight |
|---|-----------|-----------------------------------------------|:------:|
| 1 | **Wages & the producer economy** | Does it help ordinary workers capture the value they create, and make it easier to produce and sell real goods locally? | 15% |
| 2 | **Housing & family formation** | Does it make it more achievable to own a home and raise a family? | 15% |
| 3 | **Cost of essentials & sound money** | Does it restrain the runaway cost of healthcare, education, and daily life, and protect the dollar's purchasing power? | 15% |
| 4 | **Safety net with an off-ramp** | Does it keep a real safety net *while* rewarding the climb back to productive work (reducing benefit cliffs)? | 12% |
| 5 | **Small-scale enterprise & anti-monopoly** | Does it favor small producers and competition over entrenched incumbents and consolidation? | 11% |
| 6 | **Domestic strength & non-intervention** | Does it invest in domestic resources, energy, and technology and show restraint abroad rather than funding distant conflicts? | 11% |
| 7 | **Localism & decentralization** | Does it push decisions and resources closer to communities rather than centralizing them? | 11% |
| 8 | **Freedom of conscience & pluralism** | Does it protect free expression, equal treatment of differing viewpoints, and civil peace (no political violence)? | 10% |

Weights sum to 100%. They are deliberately close to even, with a modest tilt toward the three declines. **Weights are published and frozen before any scores are calculated** (Section 6).

---

## 3. How a single vote is scored

For each session of Congress we assemble a **basket of key votes** (target: 20–30 votes per chamber). For every key vote we publish, *in advance*:

1. The **bill/amendment number** and a one-line description.
2. The **Centrix-aligned position** — Yea or Nay — and a short **written rationale** tying it to a dimension.
3. A **source link** to the official roll call.

A member then earns, on each key vote:

- **1.0** — voted the Centrix-aligned way
- **0.0** — voted against it
- **Excluded** — did not vote (see missed-vote rule below)

**Missed votes.** A missed vote is normally *excluded from that member's denominator* rather than scored as a miss, so members aren't punished for a single absence. Exception: if a member misses more than 25% of the basket, we flag the score as "insufficient record" rather than publish a potentially misleading number.

---

## 4. Optional leadership layer (co-sponsorship)

Votes are reactive — they only measure choices leadership put on the floor. To also reward members who *lead*, an optional layer adds a small bonus for **sponsoring or co-sponsoring** bills whose text clearly advances a dimension:

- Up to **+5 points** total, capped, drawn from a published list of "Centrix-aligned bills."
- The bonus can never move a member across a full band on its own; it's a tie-breaker and a recognition of initiative.

v1.0 can launch **votes-only** (simplest and most defensible) and add this layer in v1.1.

---

## 5. Calculating the 0–100 score

Plain-language formula:

```
For each dimension d:
    dimension_score(d) = (aligned votes in d) / (votes cast by member in d)   → a value 0..1

Centrix Score = 100 × Σ [ weight(d) × dimension_score(d) ]   over all dimensions with ≥1 vote
                       ─────────────────────────────────────
                          Σ [ weight(d) ] over those same dimensions
```

The denominator re-normalizes across only the dimensions that actually had votes in a given session, so a member is never penalized for a dimension Congress simply didn't vote on. Then add the capped co-sponsorship bonus (if used) and clamp to 0–100.

### Worked example (illustrative — not a real member)

Suppose the basket has votes in 4 dimensions and a hypothetical **"Representative Sample"** voted:

| Dimension | Weight | Aligned / Cast | Dimension score |
|-----------|:-----:|:--------------:|:---------------:|
| 1 · Wages & producer economy | 15% | 3 / 4 | 0.75 |
| 2 · Housing & family | 15% | 2 / 2 | 1.00 |
| 3 · Cost of essentials & sound money | 15% | 1 / 3 | 0.33 |
| 6 · Domestic strength & non-intervention | 11% | 2 / 2 | 1.00 |

Weighted numerator = (.15×.75)+(.15×1.00)+(.15×.33)+(.11×1.00) = 0.1125 + 0.15 + 0.0495 + 0.11 = **0.422**
Sum of weights used = .15+.15+.15+.11 = **0.56**
Centrix Score = 100 × (0.422 / 0.56) = **75.4 → 75**

So Representative Sample scores **75** — a "Strong Ally" (Section 8) — carried by housing and non-intervention, dragged down by cost-of-living votes.

---

## 6. Pre-registration (the anti-cherry-picking rule)

The single most important integrity rule: **the vote basket, the aligned positions, and the weights are published *before* we look at how it makes anyone score.** We freeze them, timestamp them, and only then compute results. This prevents the most common (and fatal) scorecard abuse — quietly choosing votes to make your friends look good and your targets look bad. Every basket is versioned and dated, and prior versions stay public.

---

## 7. Keeping it genuinely non-partisan (bias controls)

A scorecard lives or dies on credibility. These controls are non-negotiable:

**(a) Balanced basket.** The set of Centrix-aligned positions must be split roughly evenly between positions the left typically likes and positions the right typically likes. We publish that split for every basket. If we can't find enough "crosses the aisle in both directions" votes, the basket isn't ready.

**(b) The party-symmetry test.** After scoring, we compute the *average* Centrix Score for each party. If one party averages near the floor and the other near the ceiling, the basket is secretly measuring partisanship, not Centrix alignment — and must be rebalanced and re-run. A healthy Centrix basket produces high and low scorers **in both parties.**

**(c) Public rationales.** Every aligned position ships with a written reason tied to a dimension. Anyone can read *why* Yea or Nay was the Centrix call and argue with it.

**(d) Challenge window.** Before publication, the draft basket is open for public comment for a fixed period. Reasoned objections are answered in writing.

**(e) Independent review (as we grow).** A rotating, ideologically mixed review panel signs off that the basket is balanced before release.

---

## 8. Score bands

| Score | Band | Meaning |
|:-----:|------|---------|
| 85–100 | **Centrix Champion** | Consistently votes to empower citizens across dimensions. |
| 70–84 | **Strong Ally** | Aligned most of the time, with a few gaps. |
| 55–69 | **Leans Centrix** | More aligned than not. |
| 45–54 | **Mixed** | Genuinely split — aligned on some dimensions, opposed on others. |
| 30–44 | **Off-Track** | Rarely votes the Centrix way. |
| 0–29 | **Rarely Aligned** | Voting record seldom advances citizen-empowerment priorities. |

Every published score comes with a **dimension breakdown** (ideal as a radar chart), so a "Mixed" 50 that's strong on housing but weak on foreign restraint reads completely differently from a flat 50 across the board. The breakdown is the point — it shows people *where* their representative stands, not just a single verdict.

---

## 9. Where the data comes from

All inputs are public, free, and auditable:

- **Congress.gov API** (Library of Congress) — the authoritative source. As of May 2025 it includes House roll-call votes back to the 118th Congress (2023), with member-level detail.
- **U.S. Senate roll-call votes** — published as official XML on senate.gov (the Congress.gov API's House coverage does not include the Senate, so Senate votes are pulled from the Senate's own records).
- **The unitedstates/congress open-data project** (theunitedstates.io) — bulk, structured roll-call and member data used by many civic tools; good for aggregation and historical coverage.
- **VoteView** (voteview.com) — for context and validation (e.g., checking that our score is *not* just tracking the left-right axis).

Note: the **ProPublica Congress API has been retired**, and **GovTrack's API was discontinued in 2026**, so neither should be a primary dependency; GovTrack's website remains useful for human browsing and its historical data is being republished elsewhere.

---

## 10. Scope, cadence, and comparability

- **Who:** all voting members of the current U.S. House and Senate. (State legislatures and governors are a future expansion.)
- **How often:** annually, after each session, plus a full end-of-Congress edition.
- **Two chambers:** the House and Senate vote on different measures, so each chamber gets its own basket mapped to the *same eight dimensions*. Overall scores are broadly comparable; dimension-level scores are directly comparable.
- **Versioning:** every edition is labeled with a version, date, Congress number, and the frozen basket it used.

---

## 11. Honest limitations

We publish these openly, because pretending a metric is perfect is how you lose trust:

- **Floor votes are downstream of leadership.** Members can only vote on what's brought up; a good record can be blocked by what never reaches the floor. Co-sponsorship (Section 4) partly addresses this.
- **A single vote bundles many things.** Omnibus bills mix good and bad provisions; we note when a key vote is a judgment call.
- **Weights are value choices.** Reasonable people can weight the dimensions differently — which is exactly why we publish them and invite challenge.
- **This is a lagging measure.** It reflects a term of votes, not tomorrow's promises.

---

## 12. Legal & ethical framing

Scores are **opinions grounded in disclosed methodology applied to public voting records.** We state facts we can source ("On the 12 key votes in this basket, Member X voted the Centrix-aligned way 7 times") and label the rating as our assessment, not a statement about character or intent. We do not fabricate, and we do not publish a member's number when their record is too thin to be fair (the 25% missed-vote rule). Corrections are made promptly and publicly.

---

## 13. What we need to go live

1. **Finalize the eight dimensions and weights** (this document — open for comment).
2. **Assemble the first key-vote basket** for the current Congress using the worksheet template (see `CENTRIX-SCORE-WORKSHEET.csv`), with balanced left/right aligned positions and written rationales.
3. **Pre-register** the basket (publish and timestamp).
4. **Pull the roll-call data** from the sources in Section 9 and compute scores.
5. **Run the party-symmetry test**; rebalance if needed.
6. **Publish** scores with per-member dimension breakdowns and full sourcing.

---

*Centrix is an independent citizen movement, written under the pen name Saint Moses the Black. This methodology is a draft offered for public discussion and will be revised in response to reasoned critique. Version 1.0 draft.*
