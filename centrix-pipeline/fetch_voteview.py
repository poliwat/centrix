#!/usr/bin/env python3
"""
fetch_voteview.py — pull real roll-call data (one congress or a range) for the Centrix pipeline
===============================================================================================

Downloads roll-call, member, and vote data from VoteView (free, public) and writes
two pipeline-ready CSVs, now with automatic links:

    live_rollcalls.csv     -> rollcall_key, congress, chamber, bill_number, description, bill_url, vote_url
    live_member_votes.csv  -> member_id, name, party, chamber, rollcall_key, cast

Links generated automatically:
  * bill_url  -> congress.gov page for the bill
  * vote_url  -> voteview.com page for that roll call (shows every member's vote)

Members are keyed by ICPSR, a PERMANENT id — so a person is tracked across their whole
career and across congresses, whether or not they still hold office.

Usage:
    python3 fetch_voteview.py --congress 119            # single congress, both chambers
    python3 fetch_voteview.py --congresses 109-119      # 20-year range (2005-today)
    python3 fetch_voteview.py --congresses 117-119 --chamber H

Notes:
  * Standard library only (urllib) — no pip installs.
  * A 20-year range is a LOT of data (~millions of cast records). Start small
    (e.g. --congresses 117-119) to test, then widen. The scorer only keeps the
    votes you actually adjudicate, so scoring stays fast even on a big pull.
  * VoteView cast codes: 1-3 = Yea, 4-6 = Nay, 7-9/0 = Present/absent.
  * rollcall_key is chamber+congress+"-"+rollnumber, e.g. "H119-489" (unique across congresses).
"""

import argparse, csv, io, os, re, sys, urllib.request

BASE = "https://voteview.com/static/data/out"
CAST = {"1":"Yea","2":"Yea","3":"Yea","4":"Nay","5":"Nay","6":"Nay",
        "7":"Present","8":"Present","9":"NV","0":"NV"}
PARTY = {"100":"D","200":"R"}
# VoteView bill-type prefix -> congress.gov path segment
BILLTYPE = {"HR":"house-bill","S":"senate-bill","HJRES":"house-joint-resolution",
            "SJRES":"senate-joint-resolution","HCONRES":"house-concurrent-resolution",
            "SCONRES":"senate-concurrent-resolution","HRES":"house-resolution","SRES":"senate-resolution"}

def ordinal(n):
    if 10 <= n % 100 <= 20: suf = "th"
    else: suf = {1:"st",2:"nd",3:"rd"}.get(n % 10, "th")
    return f"{n}{suf}"

def party_label(code):
    return PARTY.get(str(code).strip(), "Ind")

def bill_url(bill_number, congress):
    m = re.match(r"^\s*([A-Za-z]+)\s*\.?\s*([0-9]+)\s*$", bill_number or "")
    if not m: return ""
    seg = BILLTYPE.get(m.group(1).upper().replace(".",""))
    if not seg: return ""
    return f"https://www.congress.gov/bill/{ordinal(int(congress))}-congress/{seg}/{int(m.group(2))}"

def vote_url(letter, congress, rollnumber):
    try: rn = f"{int(rollnumber):04d}"
    except (ValueError, TypeError): return ""
    return f"https://www.voteview.com/rollcall/R{letter}{congress}{rn}"

def download(url):
    print(f"  downloading {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "centrix-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read().decode("utf-8", errors="replace")

def rows(text): return list(csv.DictReader(io.StringIO(text)))
def pick(d, *keys):
    for k in keys:
        if d.get(k): return d[k]
    return ""

def fetch_chamber(congress, letter):
    prefix = f"{letter}{congress}"
    rc  = rows(download(f"{BASE}/rollcalls/{prefix}_rollcalls.csv"))
    mem = rows(download(f"{BASE}/members/{prefix}_members.csv"))
    vot = rows(download(f"{BASE}/votes/{prefix}_votes.csv"))
    chamber = "House" if letter == "H" else "Senate"

    rc_rows = []
    for r in rc:
        rn = r["rollnumber"]
        key = f"{letter}{congress}-{rn}"
        billnum = pick(r, "bill_number")
        rc_rows.append({"rollcall_key": key, "congress": congress, "chamber": chamber,
                        "bill_number": billnum,
                        "description": pick(r, "vote_desc", "dtl_desc", "vote_question"),
                        "bill_url": bill_url(billnum, congress),
                        "vote_url": vote_url(letter, congress, rn)})

    who = {m["icpsr"]: (pick(m, "bioname"), party_label(m.get("party_code",""))) for m in mem}
    mv_rows = []
    for v in vot:
        name, party = who.get(v["icpsr"], (f"ICPSR {v['icpsr']}", "Ind"))
        mv_rows.append({"member_id": v["icpsr"], "name": name, "party": party,
                        "chamber": chamber, "rollcall_key": f"{letter}{congress}-{v['rollnumber']}",
                        "cast": CAST.get(str(v.get("cast_code","")).strip(), "NV")})
    print(f"  {congress}th {chamber}: {len(rc_rows)} roll calls, {len(mem)} members, {len(mv_rows)} cast records")
    return rc_rows, mv_rows

def parse_congresses(a):
    if a.congresses:
        m = re.match(r"^\s*(\d+)\s*-\s*(\d+)\s*$", a.congresses)
        if not m: sys.exit("--congresses must look like 109-119")
        lo, hi = int(m.group(1)), int(m.group(2))
        return list(range(lo, hi+1))
    return [a.congress]

def main():
    ap = argparse.ArgumentParser(description="Fetch VoteView data for the Centrix pipeline")
    ap.add_argument("--congress", type=int, default=119, help="single congress, e.g. 119")
    ap.add_argument("--congresses", help="range, e.g. 109-119 (overrides --congress)")
    ap.add_argument("--chamber", choices=["H","S","both"], default="both")
    ap.add_argument("--outdir", default=os.path.dirname(os.path.abspath(__file__)))
    a = ap.parse_args()

    congresses = parse_congresses(a)
    letters = ["H","S"] if a.chamber == "both" else [a.chamber]
    all_rc, all_mv = [], []
    for c in congresses:
        for L in letters:
            try:
                rc_rows, mv_rows = fetch_chamber(c, L)
                all_rc += rc_rows; all_mv += mv_rows
            except Exception as e:
                print(f"  ! could not fetch {c}th chamber {L}: {e}", file=sys.stderr)

    if not all_rc:
        sys.exit("No data fetched. Check your connection and the congress number(s).")

    rc_path = os.path.join(a.outdir, "live_rollcalls.csv")
    mv_path = os.path.join(a.outdir, "live_member_votes.csv")
    with open(rc_path, "w", newline="", encoding="utf-8") as f:
        csv.DictWriter(f, fieldnames=["rollcall_key","congress","chamber","bill_number",
                                      "description","bill_url","vote_url"]).writeheader()
        csv.DictWriter(f, fieldnames=["rollcall_key","congress","chamber","bill_number",
                                      "description","bill_url","vote_url"]).writerows(all_rc)
    with open(mv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["member_id","name","party","chamber","rollcall_key","cast"])
        w.writeheader(); w.writerows(all_mv)

    print(f"\nCongresses: {congresses[0]}–{congresses[-1]}  ({len(congresses)} total)")
    print(f"Wrote {rc_path} ({len(all_rc)} roll calls)")
    print(f"Wrote {mv_path} ({len(all_mv)} cast records)")
    print("\nNext: python3 map_aligned.py   (matches your seed votes to real roll calls)")

if __name__ == "__main__":
    main()
