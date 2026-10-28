"""公開前の検査。壊れていれば終了コード1。使い方: python3 tools/validate.py"""
import os, re, sys, json
from common import load, VIDEOS, SOCIAL, COVERS, CATEGORIES
errors = []
videos = load(VIDEOS)
ids = [v["id"] for v in videos]
if len(ids) != len(set(ids)): errors.append("id が重複")
for v in videos:
    if v.get("status") not in ("posted", "hidden", "finished"): errors.append(f"{v['id']}: status")
    if v.get("status") == "posted":
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v.get("postedDate") or ""): errors.append(f"{v['id']}: postedDate")
        if v.get("category") not in CATEGORIES: errors.append(f"{v['id']}: category {v.get('category')}")
        if v.get("cover") and not os.path.exists(os.path.join(COVERS, v["cover"])): errors.append(f"{v['id']}: cover が無い {v['cover']}")
        for it in v.get("items", []):
            if not it.get("name"): errors.append(f"{v['id']}: アイテム名が空")
            l = it.get("links") or {}
            if l.get("amazon") and not re.match(r"https://(www\.amazon\.co\.jp/dp/[A-Z0-9]{10}\?tag=simplesuna-22|amzn\.to/)", l["amazon"]): errors.append(f"{v['id']}: Amazonリンクの形 {l['amazon'][:60]}")
            if l.get("rakuten") and not re.match(r"https://(hb\.afl\.rakuten\.co\.jp/|a\.r10\.to/|bit\.ly/)", l["rakuten"]): errors.append(f"{v['id']}: 楽天リンクの形 {l['rakuten'][:60]}")
for p in load(SOCIAL):
    if p.get("followers") is not None and not isinstance(p["followers"], int): errors.append(f"social {p['platform']}: followers")
posted = sum(1 for v in videos if v.get("status") == "posted")
print(json.dumps({"ok": not errors, "posted": posted, "items": sum(len(v.get("items", [])) for v in videos if v.get("status") == "posted"), "errors": errors}, ensure_ascii=False))
sys.exit(1 if errors else 0)
