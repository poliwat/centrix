#!/usr/bin/env python3
"""
map_aligned.py — turn the bill-keyed seed into a rollcall_key-keyed aligned file
================================================================================

VoteView numbers roll calls its own way, so we can't hardcode keys like "H199".
This matcher reads your fetched `live_rollcalls.csv` and the `aligned_seed.csv`
(keyed by bill number), finds the matching roll call(s), and writes
`aligned_positions.mapped.csv` for you to review.

It NEVER guesses silently:
  * exactly one good match  -> written, marked OK
  * several candidates       -> best guess written, marked CONFIRM (with the list)
  * nothing found            -> reported, nothing written for that bill

Run (inside centrix-pipeline, after fetch_voteview.py):
    python3 map_aligned.py

Then eyeball `aligned_positions.mapped.csv`, fix any CONFIRM rows, and score:
    python3 centrix_pipeline.py --rollcalls live_rollcalls.csv \
        --members live_member_votes.csv --aligned aligned_positions.mapped.csv
"""

import csv, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PASSAGE = ["passage", "on agreeing", "agree to", "concur", "adoption", "adopt", "final"]

def norm(s):
    return re.sub(r"[^A-Za-z0-9]", "", s or "").upper()

def read(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def main():
    rc_path = os.path.join(HERE, "live_rollcalls.csv")
    seed_path = os.path.join(HERE, "aligned_seed.csv")
    if not os.path.exists(rc_path):
        print("live_rollcalls.csv not found — run fetch_voteview.py first.", file=sys.stderr)
        sys.exit(1)

    rollcalls = read(rc_path)
    seed = read(seed_path)
    out, report = [], []

    for s in seed:
        bill = s.get("bill_number", "").strip()
        kw = s.get("prefer_desc_contains", "").strip().lower()
        cong = str(s.get("congress", "")).strip()   # match within the right congress
        nbill = norm(bill)
        # candidate roll calls
        cands = []
        for r in rollcalls:
            if cong and str(r.get("congress","")).strip() and str(r.get("congress","")).strip() != cong:
                continue
            desc = (r.get("description", "") or "").lower()
            bill_ok = (norm(r.get("bill_number", "")) == nbill) if nbill else True
            kw_ok = (kw in desc) if kw else True
            if bill_ok and kw_ok and (nbill or kw):   # require at least one criterion
                cands.append(r)
        # prefer passage-type votes when several
        if len(cands) > 1:
            passy = [c for c in cands if any(p in (c.get("description","") or "").lower() for p in PASSAGE)]
            ranked = passy or cands
        else:
            ranked = cands

        label = bill or f"[{kw}]"
        if not ranked:
            report.append(f"  NOT FOUND  {label}: no roll call matched — search live_rollcalls.csv by hand.")
            continue
        best = ranked[0]
        status = "OK" if len(ranked) == 1 else "CONFIRM"
        out.append({"rollcall_key": best["rollcall_key"],
                    "centrix_aligned_position": s["centrix_aligned_position"],
                    "dimension": s.get("dimension",""),
                    "set_by": "seed", "rationale": s["rationale"]})
        line = f"  {status:8} {label} -> {best['rollcall_key']}  \"{(best.get('description') or '')[:70]}\""
        report.append(line)
        if status == "CONFIRM":
            for c in ranked[1:6]:
                report.append(f"           alt: {c['rollcall_key']}  \"{(c.get('description') or '')[:70]}\"")

    outp = os.path.join(HERE, "aligned_positions.mapped.csv")
    with open(outp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["rollcall_key","centrix_aligned_position","dimension","set_by","rationale"])
        w.writeheader(); w.writerows(out)

    print("Bill -> roll call matches:")
    print("\n".join(report))
    print(f"\nWrote {outp} with {len(out)} row(s).")
    print("Review CONFIRM rows (pick the right passage vote), then run the pipeline with")
    print("  --aligned aligned_positions.mapped.csv")

if __name__ == "__main__":
    main()
