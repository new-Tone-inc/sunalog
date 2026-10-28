"""過去の投稿（2024年など）の取り込み対象を、新しい順に N 件出す。
使い方: python3 tools/backfill_targets.py [--year 2024] [--n 5]
出力: まだ data/videos.json に無いリールの [{code, date, url}] をJSONで標準出力に。
reels-list.json に載っている投稿だけが対象（一覧の取り直しは不要）。
"""
import sys, json
from common import load, VIDEOS, REELS, reel_code

year = "2024"; n = 5
args = sys.argv[1:]
if "--year" in args: year = args[args.index("--year") + 1]
if "--n" in args: n = int(args[args.index("--n") + 1])
known = {reel_code(v.get("instagramUrl")) for v in load(VIDEOS)}
targets = [r for r in load(REELS) if (r.get("date") or "").startswith(year) and r["code"] not in known]
targets.sort(key=lambda r: r["date"], reverse=True)
out = [{"code": r["code"], "date": r["date"], "url": f"https://www.instagram.com/p/{r['code']}/"} for r in targets[:n]]
print(json.dumps({"remaining": len(targets), "targets": out}, ensure_ascii=False, indent=1))
