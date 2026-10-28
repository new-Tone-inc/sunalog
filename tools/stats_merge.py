"""インサイトの数値を videos.json の stats に書き込む。使い方: python3 tools/stats_merge.py <stats.json>
stats.json: {"<id>": {"likes": 10, "saves": 3, "comments": 1}, ...}（likes と saves が数値のものだけ反映。それ以外は飛ばす）
"""
import sys, json
from common import load, save, VIDEOS, today
stats = load(sys.argv[1])
videos = load(VIDEOS)
n = 0
for v in videos:
    s = stats.get(v["id"])
    if not s or not isinstance(s.get("likes"), int) or not isinstance(s.get("saves"), int): continue
    v["stats"] = {"likes": s["likes"], "saves": s["saves"], "comments": s.get("comments") if isinstance(s.get("comments"), int) else (v.get("stats") or {}).get("comments"), "asOf": today()}
    n += 1
save(VIDEOS, videos)
print(json.dumps({"updated": n, "skipped": [k for k in stats if k not in {v['id'] for v in videos}]}, ensure_ascii=False))
