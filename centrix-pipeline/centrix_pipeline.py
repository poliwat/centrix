#!/usr/bin/env python3
"""
Centrix Score — classification & scoring pipeline
=================================================

Turns a full roll-call list into a transparent, auditable Centrix Score.

Design principle (the whole point):
  * The MACHINE decides "is this vote Centrix-relevant, and which dimension?"
    -> mechanical, keyword-based, fully logged. No black box.
  * A HUMAN decides "which way is the Centrix-aligned vote?"
    -> the value judgment stays visible in aligned_positions.csv.

Every classification decision is written to classified_votes.csv with the exact
keywords that triggered it and a needs_review flag, so anyone can audit or override.

Stages:
  1. classify  : read roll calls, tag each as relevant/irrelevant + dimension
  2. score     : combine relevant+adjudicated votes with member cast codes -> 0-100
  3. report    : print a readable summary + the party-symmetry integrity check

Run on the bundled sample (no network needed):
    python3 centrix_pipeline.py

Run on live data (see README for how to fetch VoteView / Congress.gov files):
    python3 centrix_pipeline.py \
        --rollcalls live_rollcalls.csv \
        --members  live_member_votes.csv \
        --aligned  aligned_positions.csv \
        --rules    rules.json \
        --outdir   .
"""

import argparse, csv, json, os, re
from collections import defaultdict

# VoteView numeric cast codes -> our simple labels (used when loading live data)
VOTEVIEW_CAST = {1:"Yea",2:"Yea",3:"Yea",4:"Nay",5:"Nay",6:"Nay",
                 7:"Present",8:"Present",9:"NV",0:"NV"}

BANDS = [(85,"Centrix Champion"),(70,"Strong Ally"),(55,"Leans Centrix"),
         (45,"Mixed"),(30,"Off-Track"),(0,"Rarely Aligned")]

def band(score):
    for cut,label in BANDS:
        if score >= cut: return label
    return "Rarely Aligned"

# ---------------------------------------------------------------- classify
def classify_vote(desc, rules):
    """Return a dict describing how this roll call was classified. Transparent by design."""
    t = " " + desc.lower() + " "
    for pat in rules["exclude_patterns"]:
        if re.search(pat, t):
            return dict(relevant=False, dimension="", dimension_name="",
                        triggers="", needs_review=False,
                        reason=f"excluded (matched '{pat}')")
    hits, triggers = {}, {}
    for dim, spec in rules["dimensions"].items():
        found = [kw for kw in spec["keywords"] if kw in t]
        if found:
            hits[dim] = len(found); triggers[dim] = found
    if not hits:
        return dict(relevant=False, dimension="", dimension_name="",
                    triggers="", needs_review=False,
                    reason="no dimension keyword matched")
    ordered = sorted(hits.items(), key=lambda kv: -kv[1])
    top_dim, top_n = ordered[0]
    tie = len(ordered) >= 2 and ordered[1][1] == top_n
    needs_review = bool(tie or top_n == 1)   # weak (single keyword) or ambiguous -> flag
    reason = "classified"
    if tie: reason = f"AMBIGUOUS: ties with dim {ordered[1][0]}"
    elif top_n == 1: reason = "WEAK: single keyword match"
    return dict(relevant=True, dimension=top_dim,
                dimension_name=rules["dimension_names"][top_dim],
                triggers="; ".join(triggers[top_dim]),
                needs_review=needs_review, reason=reason)

def run_classify(rollcalls, aligned, rules):
    rows = []
    for rc in rollcalls:
        c = classify_vote(rc["description"], rules)
        pos = aligned.get(rc["rollcall_key"], "")
        if c["relevant"] and not pos:
            c["needs_review"] = True
            c["reason"] += " | aligned position NOT yet set by a human"
        rows.append({
            "rollcall_key": rc["rollcall_key"], "congress": rc.get("congress",""),
            "chamber": rc["chamber"],
            "bill_number": rc.get("bill_number",""), "description": rc["description"],
            "bill_url": rc.get("bill_url",""), "vote_url": rc.get("vote_url",""),
            "relevant": c["relevant"], "dimension": c["dimension"],
            "dimension_name": c["dimension_name"], "trigger_keywords": c["triggers"],
            "centrix_aligned_position": pos, "needs_review": c["needs_review"],
            "reason": c["reason"],
        })
    return rows

# ---------------------------------------------------------------- score
def run_score(classified, member_votes, rules, missed_threshold=0.25):
    weights = {k: float(v) for k,v in rules["weights"].items()}
    names = rules["dimension_names"]
    # scored universe = relevant votes that have a human-set aligned position
    scored = {r["rollcall_key"]: r for r in classified
              if r["relevant"] and r["centrix_aligned_position"] in ("Yea","Nay")}
    total_scored = len(scored)

    # gather each member's casts — keep ONLY the scored votes (fast even on a 20-year pull)
    scored_keys = set(scored.keys())
    members = defaultdict(lambda: {"name":"","party":"","chamber":"","casts":{}})
    for mv in member_votes:
        if mv["rollcall_key"] not in scored_keys:
            continue
        m = members[mv["member_id"]]
        m["name"], m["party"] = mv["name"], mv["party"]
        m["chamber"] = mv.get("chamber","")
        m["casts"][mv["rollcall_key"]] = mv["cast"]

    results = []
    for mid, m in members.items():
        per_dim_aligned = defaultdict(float); per_dim_cast = defaultdict(float)
        cast_count = missed = 0
        for rk, rec in scored.items():
            cast = m["casts"].get(rk, "NV")
            if cast in ("Yea","Nay"):
                cast_count += 1
                d = rec["dimension"]
                per_dim_cast[d] += 1
                if cast == rec["centrix_aligned_position"]:
                    per_dim_aligned[d] += 1
            else:
                missed += 1
        # weighted, re-normalized across dimensions the member actually voted in
        num = den = 0.0; dim_scores = {}
        for d in weights:
            if per_dim_cast[d] > 0:
                ds = per_dim_aligned[d] / per_dim_cast[d]
                dim_scores[d] = round(100*ds)
                num += weights[d]*ds; den += weights[d]
        score = round(100*num/den) if den else None
        insufficient = total_scored and (missed/total_scored) > missed_threshold
        results.append({
            "member_id": mid, "name": m["name"], "party": m["party"], "chamber": m["chamber"],
            "centrix_score": "insufficient record" if insufficient else score,
            "band": "" if (insufficient or score is None) else band(score),
            "votes_cast": cast_count, "votes_missed": missed,
            "dimension_scores": {names[d]: dim_scores[d] for d in dim_scores},
        })
    return results, total_scored

# ---------------------------------------------------------------- io helpers
def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def write_csv(path, rows, fields):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader()
        for r in rows: w.writerow({k: r.get(k,"") for k in fields})

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Centrix Score classification & scoring pipeline")
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--rollcalls", default=os.path.join(here,"sample_rollcalls.csv"))
    ap.add_argument("--members",   default=os.path.join(here,"sample_member_votes.csv"))
    ap.add_argument("--aligned",   default=os.path.join(here,"aligned_positions.csv"))
    ap.add_argument("--rules",     default=os.path.join(here,"rules.json"))
    ap.add_argument("--outdir",    default=here)
    a = ap.parse_args()

    rules = json.load(open(a.rules, encoding="utf-8"))
    rollcalls = read_csv(a.rollcalls)
    aligned_rows = read_csv(a.aligned)
    aligned = {r["rollcall_key"]: r["centrix_aligned_position"] for r in aligned_rows}
    aligned_dim = {r["rollcall_key"]: str(r.get("dimension","")).strip() for r in aligned_rows}
    member_votes = read_csv(a.members)

    classified = run_classify(rollcalls, aligned, rules)
    # Human adjudication is authoritative: if a vote has an aligned position but the
    # keyword classifier missed it (or assigned no dimension), trust the human's dimension.
    for rec in classified:
        if rec["centrix_aligned_position"] in ("Yea","Nay") and (not rec["relevant"] or not rec["dimension"]):
            d = aligned_dim.get(rec["rollcall_key"], "")
            if d in rules["dimension_names"]:
                rec["relevant"] = True; rec["dimension"] = d
                rec["dimension_name"] = rules["dimension_names"][d]
                rec["reason"] = "relevant + dimension set by human (aligned_seed)"
                rec["needs_review"] = False
    write_csv(os.path.join(a.outdir,"classified_votes.csv"), classified,
              ["rollcall_key","congress","chamber","bill_number","description","bill_url","vote_url",
               "relevant","dimension","dimension_name","trigger_keywords",
               "centrix_aligned_position","needs_review","reason"])

    # scored_votes.csv — the votes actually counted, each with links to the bill and the roll call
    scored_votes = [r for r in classified if r["relevant"] and r["centrix_aligned_position"] in ("Yea","Nay")]
    write_csv(os.path.join(a.outdir,"scored_votes.csv"), scored_votes,
              ["congress","rollcall_key","chamber","bill_number","dimension","dimension_name",
               "centrix_aligned_position","description","bill_url","vote_url"])

    results, total_scored = run_score(classified, member_votes, rules)
    write_csv(os.path.join(a.outdir,"centrix_scores.csv"),
              [{**r,"dimension_scores":json.dumps(r["dimension_scores"])} for r in results],
              ["member_id","name","party","chamber","centrix_score","band",
               "votes_cast","votes_missed","dimension_scores"])

    # ---- ranked leaderboard: name -> score, high to low ----
    def sort_key(r):
        s = r["centrix_score"]
        return (0, -s) if isinstance(s, int) else (1, 0)   # numeric first (desc), insufficient last
    ranked = sorted(results, key=sort_key)
    ranking_rows, rank = [], 0
    for r in ranked:
        if isinstance(r["centrix_score"], int):
            rank += 1; pos = rank
        else:
            pos = ""
        ranking_rows.append({"rank": pos, "name": r["name"], "party": r["party"],
                             "chamber": r["chamber"], "centrix_score": r["centrix_score"],
                             "band": r["band"]})
    write_csv(os.path.join(a.outdir,"centrix_ranking.csv"), ranking_rows,
              ["rank","name","party","chamber","centrix_score","band"])

    # ---- readable report ----
    rel = [c for c in classified if c["relevant"]]
    review = [c for c in rel if c["needs_review"]]
    print("="*66)
    print("CENTRIX SCORE PIPELINE — RUN REPORT")
    print("="*66)
    print(f"Roll calls processed : {len(rollcalls)}")
    print(f"  Centrix-relevant   : {len(rel)}")
    print(f"  Filtered out       : {len(rollcalls)-len(rel)} (procedural / no dimension)")
    print(f"  Flagged for review : {len(review)}  (weak/ambiguous/aligned-position unset)")
    print(f"  In scored universe : {total_scored} (relevant + human-adjudicated)")
    print("-"*66)
    print("CLASSIFICATION (what the machine decided):")
    for c in classified:
        tag = f"dim {c['dimension']}" if c["relevant"] else "—"
        flag = "  <REVIEW>" if c["needs_review"] else ""
        print(f"  {c['rollcall_key']} [{tag}] {c['reason']}{flag}")
    print("-"*66)
    # ---- party-symmetry integrity check ----
    by_party = defaultdict(list)
    for r in results:
        if isinstance(r["centrix_score"], int): by_party[r["party"]].append(r["centrix_score"])
    print("PARTY-SYMMETRY TEST (is the basket measuring Centrix or just party?):")
    for p, xs in sorted(by_party.items()):
        print(f"  {p:<7} n={len(xs)}  avg={sum(xs)/len(xs):.0f}  range={min(xs)}-{max(xs)}")
    spread_ok = all(max(xs)-min(xs) >= 15 for xs in by_party.values() if len(xs) > 1)
    print("  -> Healthy: high AND low scorers appear within parties."
          if spread_ok else
          "  -> WARNING: a party clusters tightly; basket may be tracking partisanship.")
    # ---- ranked leaderboard printout (name -> score) ----
    print("-"*66)
    print("RANKING (name -> Centrix Score, high to low):")
    chambers = [c for c in ["Senate","House"] if any(r["chamber"]==c for r in ranking_rows)]
    groups = ([(c, [r for r in ranking_rows if r["chamber"]==c]) for c in chambers]
              if chambers else [("All members", ranking_rows)])
    seen = {id(r) for _,g in groups for r in g}
    leftover = [r for r in ranking_rows if id(r) not in seen]
    if leftover: groups.append(("Other", leftover))
    for cname, g in groups:
        print(f"  --- {cname} ---")
        for r in g:
            pos = f"{r['rank']:>3}." if r["rank"] != "" else "    "
            print(f"  {pos} {r['name']:<26} ({r['party']:<6}) {str(r['centrix_score']):>20}  {r['band']}")
    print("="*66)
    print(f"Wrote: classified_votes.csv, scored_votes.csv, centrix_scores.csv, centrix_ranking.csv  to {a.outdir}")

if __name__ == "__main__":
    main()
