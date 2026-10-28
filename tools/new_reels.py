"""Chromeで取ったリール一覧（[{code, date?, cover?}]）と、サイトに登録済みの投稿を見比べて、未登録のコードを出す。
使い方: python3 tools/new_reels.py <codes.json>
出力: 未登録の [{code, mediaId, url}] をJSONで標準出力に。
"""
import sys, json
from common import load, VIDEOS, REELS, reel_code, shortcode_to_media_id

codes = load(sys.argv[1])
if isinstance(codes, dict):
    codes = codes.get("codes", [])
known = {reel_code(v.get("instagramUrl")) for v in load(VIDEOS)}
known |= {r["code"] for r in load(REELS)}
out = []
for c in codes:
    code = c["code"] if isinstance(c, dict) else c
    if code and code not in known:
        out.append({"code": code, "mediaId": shortcode_to_media_id(code), "url": f"https://www.instagram.com/p/{code}/", "date": (c.get("date") if isinstance(c, dict) else None)})
print(json.dumps(out, ensure_ascii=False, indent=1))
