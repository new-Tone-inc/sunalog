"""インサイトを取り直す投稿の一覧を出す。使い方: python3 tools/insights_targets.py --days 30
出力: [{id, mediaId, insightsUrl, postedDate}]（postedDate が指定日数以内の posted 投稿。投稿が新しい順）
"""
import sys, json, datetime
from common import load, VIDEOS, reel_code, shortcode_to_media_id
days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 30
since = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
out = []
for v in load(VIDEOS):
    if v.get("status") != "posted" or not v.get("instagramUrl") or (v.get("postedDate") or "") < since: continue
    mid = shortcode_to_media_id(reel_code(v["instagramUrl"]))
    out.append({"id": v["id"], "mediaId": mid, "insightsUrl": f"https://www.instagram.com/insights/media/{mid}/", "postedDate": v["postedDate"]})
print(json.dumps(out, ensure_ascii=False, indent=1))
