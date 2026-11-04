#!/usr/bin/env python3
"""投稿ごとの共有用ページ（p/{id}.html）とOGP画像（assets/og/{id}.jpg）を data/videos.json から生成する。

- 共有URLは https://sunalog.newtone-inc.jp/p/{id}（GitHub Pagesは拡張子なしで .html を返す）
- ページはOGP（タイトル・説明・画像）を持ち、開くとすぐトップの詳細（/#id）へ移る
- OGP画像は 1200x630。縦長のカバー画像を高さ630に縮めて中央に置き、両脇をブランド色で埋める（macOSの sips を使う）
- 公開中（status: posted）の投稿だけ作る。非公開・未投稿の分は消す
実行: python3 tools/share_pages.py   （作業フォルダから。毎朝の自動更新の「4. 検査・公開」の前に走らせる）
"""
import html
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://sunalog.newtone-inc.jp"
BRAND = "E94B25"
P_DIR = os.path.join(ROOT, "p")
OG_DIR = os.path.join(ROOT, "assets", "og")
COVER_DIR = os.path.join(ROOT, "assets", "covers")

TEMPLATE = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | すなおのガジェログ</title>
<meta name="description" content="{desc}">
<meta name="robots" content="noindex">
<link rel="canonical" href="{site}/#{id}">
<link rel="icon" href="{site}/assets/brand/favicon.ico" sizes="any">
<meta property="og:type" content="article">
<meta property="og:site_name" content="すなおのガジェログ">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{site}/p/{id}">
<meta property="og:image" content="{site}/{image}">
{image_size}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{site}/{image}">
<meta http-equiv="refresh" content="0; url=/#{id}">
<script>location.replace("/#" + {id_json});</script>
<style>body{{font-family:system-ui,-apple-system,"Noto Sans JP",sans-serif;margin:0;padding:40px 16px;text-align:center;color:#2b3135}}a{{color:#e94b25}}</style>
</head>
<body>
<p>{title}</p>
<p><a href="/#{id}">すなおのガジェログで見る</a></p>
</body>
</html>
"""


def make_og(cover_path, out_path):
    """縦長カバー → 1200x630（高さ630に縮小して中央、両脇はブランド色）。失敗したら False"""
    try:
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", cover_path, "--out", out_path],
                       check=True, capture_output=True)
        subprocess.run(["sips", "--resampleHeight", "630", out_path], check=True, capture_output=True)
        subprocess.run(["sips", "-p", "630", "1200", "--padColor", BRAND, out_path], check=True, capture_output=True)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"og image failed: {cover_path}: {e}", file=sys.stderr)
        if os.path.exists(out_path):
            os.remove(out_path)
        return False


def describe(v):
    items = [it.get("name", "") for it in (v.get("items") or []) if it.get("name")]
    parts = []
    if v.get("hook"):
        parts.append(v["hook"].strip())
    if items:
        s = "紹介アイテム: " + "、".join(items[:4])
        if len(items) > 4:
            s += f" ほか{len(items) - 4}点"
        parts.append(s)
    desc = " / ".join(parts) or "Instagram @simple_suna で紹介したショート動画とアイテム"
    return desc[:160]


def main():
    data = json.load(open(os.path.join(ROOT, "data", "videos.json"), encoding="utf-8"))
    posted = [v for v in data if (v.get("status") or "posted") == "posted" and v.get("id")]
    os.makedirs(P_DIR, exist_ok=True)
    os.makedirs(OG_DIR, exist_ok=True)
    keep_p, keep_og = set(), set()
    made_og = 0
    for v in posted:
        vid = v["id"]
        cover = v.get("cover")
        image = "assets/brand/og-image.png"
        size = '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
        if cover and os.path.exists(os.path.join(COVER_DIR, cover)):
            og = os.path.join(OG_DIR, f"{vid}.jpg")
            src = os.path.join(COVER_DIR, cover)
            if not os.path.exists(og) or os.path.getmtime(og) < os.path.getmtime(src):
                if make_og(src, og):
                    made_og += 1
            if os.path.exists(og):
                image = f"assets/og/{vid}.jpg"
                keep_og.add(f"{vid}.jpg")
        page = TEMPLATE.format(
            title=html.escape(v.get("title", ""), quote=True),
            desc=html.escape(describe(v), quote=True),
            site=SITE, id=html.escape(vid, quote=True), id_json=json.dumps(vid, ensure_ascii=False),
            image=image, image_size=size,
        )
        path = os.path.join(P_DIR, f"{vid}.html")
        if not os.path.exists(path) or open(path, encoding="utf-8").read() != page:
            open(path, "w", encoding="utf-8").write(page)
        keep_p.add(f"{vid}.html")
    removed = 0
    for d, keep in ((P_DIR, keep_p), (OG_DIR, keep_og)):
        for f in os.listdir(d):
            if f not in keep and not f.startswith("."):
                os.remove(os.path.join(d, f))
                removed += 1
    print(json.dumps({"pages": len(keep_p), "og_images": len(keep_og), "og_made": made_og, "removed": removed}, ensure_ascii=False))


if __name__ == "__main__":
    main()
