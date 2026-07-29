#!/usr/bin/env python3
"""
propose_adjudications.py — a DISCOVERY tool for scaling the vote basket
=======================================================================

Over 20 years there are ~18,000 roll calls. You can't hand-read them all. This
tool shrinks that to a reviewable queue: it runs the transparent keyword
classifier over every vote, keeps the Centrix-relevant ones you haven't already
adjudicated, and writes them to `proposed_adjudications.csv` for you to review.

It is a DISCOVERY aid, never the final word:
  * The machine proposes (relevance, dimension, and — optionally — a suggested
    aligned position with a one-line reason).
  * YOU review each row, and promote the good ones into `aligned_seed.csv`.
Nothing is scored until it's in the seed with a position you approved.

Run (after fetch_voteview.py has produced live_rollcalls.csv):
    python3 propose_adjudications.py                 # free: triage + dimensions
    python3 propose_adjudications.py --passage-only   # only passage-type votes (less noise)

Optional LLM suggestions (proposes a Yea/Nay + rationale you still must review):
    export ANTHROPIC_API_KEY=sk-...
    python3 propose_adjudications.py --llm

Then open proposed_adjudications.csv, keep the rows you agree with, and append
them to aligned_seed.csv (congress, bill_number, centrix_aligned_position,
prefer_desc_contains, dimension, rationale).
"""

import argparse, csv, json, os, re, sys, urllib.request
import centrix_pipeline as cp   # reuse the exact same classifier

PASSAGE = ["passage", "on agreeing", "agree to", "concur", "adoption", "adopt", "final"]

def norm(s): return re.sub(r"[^A-Za-z0-9]", "", s or "").upper()

def seed_keys(seed_path):
    seen = set()
    if os.path.exists(seed_path):
        for r in cp.read_csv(seed_path):
            seen.add((str(r.get("congress","")).strip(), norm(r.get("bill_number",""))))
    return seen

# ---- optional LLM proposal (Anthropic). Best-effort; requires review either way ----
def llm_positions(batch, api_key, model="claude-3-5-haiku-latest"):
    lines = "\n".join(f'{v["rollcall_key"]} | dim {v["dimension"]} ({v["dimension_name"]}) | {v["description"][:160]}'
                      for v in batch)
    prompt = ("You are helping build a NON-PARTISAN scorecard that rewards votes empowering ordinary "
              "citizens to produce and prosper (housing, wages, cost of living, a work-rewarding safety net, "
              "anti-monopoly, domestic strength/non-intervention, localism, free conscience + no political violence). "
              "For each roll call below, reply with one line: ROLLCALL_KEY | Yea or Nay | <=12-word reason. "
              "Yea/Nay = the vote a Centrix supporter would cast. Be even-handed across parties.\n\n" + lines)
    body = json.dumps({"model": model, "max_tokens": 1024,
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body,
                                 headers={"x-api-key": api_key, "anthropic-version": "2023-06-01",
                                          "content-type": "application/json"})
    out = {}
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
        text = "".join(b.get("text","") for b in data.get("content",[]))
        for ln in text.splitlines():
            parts = [p.strip() for p in ln.split("|")]
            if len(parts) >= 3 and parts[1] in ("Yea","Nay"):
                out[parts[0]] = (parts[1], parts[2])
    except Exception as e:
        print(f"  ! LLM call failed ({e}); leaving suggestions blank.", file=sys.stderr)
    return out

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description="Build a review queue of Centrix-relevant votes")
    ap.add_argument("--rollcalls", default=os.path.join(here, "live_rollcalls.csv"))
    ap.add_argument("--rules", default=os.path.join(here, "rules.json"))
    ap.add_argument("--seed", default=os.path.join(here, "aligned_seed.csv"))
    ap.add_argument("--passage-only", action="store_true", help="keep only passage-type votes")
    ap.add_argument("--llm", action="store_true", help="use ANTHROPIC_API_KEY to suggest positions")
    ap.add_argument("--out", default=os.path.join(here, "proposed_adjudications.csv"))
    a = ap.parse_args()

    if not os.path.exists(a.rollcalls):
        sys.exit("live_rollcalls.csv not found — run fetch_voteview.py first.")
    rules = json.load(open(a.rules, encoding="utf-8"))
    already = seed_keys(a.seed)

    proposed = []
    for rc in cp.read_csv(a.rollcalls):
        desc = rc.get("description","")
        if a.passage_only and not any(p in desc.lower() for p in PASSAGE):
            continue
        c = cp.classify_vote(desc, rules)
        if not c["relevant"]:
            continue
        key = (str(rc.get("congress","")).strip(), norm(rc.get("bill_number","")))
        if key in already:           # skip votes you've already adjudicated
            continue
        proposed.append({"congress": rc.get("congress",""), "rollcall_key": rc.get("rollcall_key",""),
                         "chamber": rc.get("chamber",""), "bill_number": rc.get("bill_number",""),
                         "dimension": c["dimension"], "dimension_name": c["dimension_name"],
                         "description": desc, "bill_url": rc.get("bill_url",""),
                         "vote_url": rc.get("vote_url",""),
                         "suggested_position": "", "rationale": "", "status": "review"})

    # optional LLM suggestions
    if a.llm:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            print("  ! --llm set but ANTHROPIC_API_KEY not found; skipping suggestions.", file=sys.stderr)
        else:
            for i in range(0, len(proposed), 15):
                sugg = llm_positions(proposed[i:i+15], key)
                for v in proposed[i:i+15]:
                    if v["rollcall_key"] in sugg:
                        v["suggested_position"], v["rationale"] = sugg[v["rollcall_key"]]

    fields = ["congress","rollcall_key","chamber","bill_number","dimension","dimension_name",
              "description","bill_url","vote_url","suggested_position","rationale","status"]
    cp.write_csv(a.out, proposed, fields)
    by_dim = {}
    for p in proposed: by_dim[p["dimension_name"]] = by_dim.get(p["dimension_name"],0)+1
    print(f"Proposed {len(proposed)} Centrix-relevant votes for review -> {a.out}")
    for d,n in sorted(by_dim.items()):
        print(f"  {n:>5}  {d}")
    print("\nReview proposed_adjudications.csv, keep the ones you agree with, and append")
    print("approved rows to aligned_seed.csv. Only seed rows are ever scored.")

if __name__ == "__main__":
    main()
