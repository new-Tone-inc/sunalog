"""新しい投稿の下書き（JSON配列）を data/videos.json に追加し、カバー画像を保存し、reels-list.json にも登録する。
使い方: python3 tools/add_videos.py <draft.json>
draft の1件: {
  "id": "slug", "title": "...", "status": "posted"|"hidden", "postedDate": "YYYY-MM-DD", "instagramUrl": "https://www.instagram.com/reel/CODE/",
  "coverUrl": "https://...（og:image）", "hook": "...", "caption": "...", "hashtags": ["#..."], "category": "...", "pr": false,
  "hiddenReason": "（hiddenのときだけ）", "items": [{"name","brand","price","officialUrl","note","links":{"amazon","rakuten","official"}}]
}
同じ instagramUrl / id が既にあれば追加しない（上書きもしない）。
"""
import sys, json, subprocess, os, re
from common import load, save, VIDEOS, REELS, COVERS, CATEGORIES, reel_code, today

draft = load(sys.argv[1])
videos = load(VIDEOS)
reels = load(REELS)
known_urls = {reel_code(v.get("instagramUrl")) for v in videos}
known_ids = {v["id"] for v in videos}
known_codes = {r["code"] for r in reels}
added = []
for v in draft:
    code = reel_code(v.get("instagramUrl"))
    assert code, f"instagramUrl が無い: {v.get('id')}"
    if code in known_urls:
        print(f"skip（登録済み）: {code}"); continue
    assert v.get("id") and v["id"] not in known_ids, f"id が空か重複: {v.get('id')}"
    assert re.fullmatch(r"[a-z0-9-]+", v["id"]), f"id は英小文字・数字・ハイフン: {v['id']}"
    assert v.get("status") in ("posted", "hidden"), f"status は posted か hidden: {v['id']}"
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", v.get("postedDate") or ""), f"postedDate は YYYY-MM-DD: {v['id']}"
    assert v.get("category") in CATEGORIES, f"category が一覧に無い: {v['id']} {v.get('category')}"
    # カバーはログイン不要の経路 https://www.instagram.com/p/{code}/media/?size=l で取れる（2026-10-28確認）。coverUrl があればそちらを優先
    cover_url = v.pop("coverUrl", None) or f"https://www.instagram.com/p/{code}/media/?size=l"
    cover = None
    if cover_url:
        cover = f"{v['id']}.jpg"
        dst = os.path.join(COVERS, cover)
        r = subprocess.run(["curl", "-sL", "-m", "30", "-A", "Mozilla/5.0", "-o", dst, cover_url])
        if r.returncode != 0 or not os.path.exists(dst) or os.path.getsize(dst) < 5000:
            if os.path.exists(dst): os.remove(dst)
            cover = None
            print(f"カバー取得できず: {v['id']}")
    for it in v.get("items", []):
        it.setdefault("brand", None); it.setdefault("price", None); it.setdefault("officialUrl", None); it.setdefault("note", None)
        it.setdefault("links", {}); it["links"] = {k: it["links"].get(k) for k in ("amazon", "rakuten", "official")}
    entry = {"id": v["id"], "title": v["title"], "status": v["status"], "postedDate": v["postedDate"], "dateSource": "instagram",
             "instagramUrl": f"https://www.instagram.com/reel/{code}/", "youtubeUrl": None, "cover": cover,
             "hook": v.get("hook") or (v.get("caption") or "").split("\n")[0], "caption": v.get("caption"), "hashtags": v.get("hashtags") or [],
             "category": v["category"], "pr": bool(v.get("pr")), "items": v.get("items", []), "itemsSource": v.get("itemsSource") or f"自動更新（{today()}）"}
    if v.get("itemsPending"):
        entry["itemsPending"] = True  # 本文にアイテム名が無く動画内だけで紹介 → サイトでは「準備中」と出す
    if v["status"] == "hidden":
        entry["hiddenReason"] = v.get("hiddenReason") or f"製品紹介でない投稿のため非表示（自動更新 {today()}）"
    videos.append(entry)
    if code not in known_codes:
        reels.insert(0, {"code": code, "date": v["postedDate"], "onSite": v["status"] == "posted"})
    added.append(entry["id"])
videos.sort(key=lambda x: (x.get("postedDate") or ""), reverse=True)
save(VIDEOS, videos); save(REELS, reels)
print(json.dumps({"added": added}, ensure_ascii=False))
