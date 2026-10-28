"""フォロワー数を data/social.json に書き込む。使い方: python3 tools/social_update.py <counts.json>
counts.json: {"Instagram": 41558, "TikTok": 13400, "YouTube": 1280, "Threads": 14684}（数値のものだけ更新。取れなかったSNSは前回の値のまま）
"""
import sys, json
from common import load, save, SOCIAL, today
counts = load(sys.argv[1])
social = load(SOCIAL)
changed = {}
for p in social:
    c = counts.get(p["platform"])
    if isinstance(c, int) and c > 0:
        changed[p["platform"]] = (p.get("followers"), c)
        p["followers"] = c; p["asOf"] = today()
save(SOCIAL, social)
print(json.dumps({"changed": changed}, ensure_ascii=False))
