#!/usr/bin/env python3
"""セールの特設ページ用データ（data/sale.json）を作る。

Amazonの商品ページを読んだ結果（data/sale-raw.json。ASINごとの価格・セール表示）と data/videos.json を突き合わせ、
「サイトに載せているアイテムのうち、いまセール表示が出ているもの」だけを data/sale.json に書き出す。

- 載せる条件: 商品ページにセールのバッジ（先行セール・タイムセール・厳選目玉商品 など）が出ていて、価格が読め、在庫がある
- 値引き表示（-○%）だけでバッジが無いものは載せない（ふだんから出ている表示のため）
- 名前・画像・リンクはサイト（data/videos.json）のものをそのまま使う。リンクは作り変えない
- セールの名前・期間などは data/sale.json の items 以外の項目。このスクリプトは items と checkedAt だけを書き換える

実行: python3 tools/sale_build.py [確認した日 YYYY-MM-DD]   （省略すると今日）
"""
import os
import re
import sys

from common import load, save, VIDEOS, ROOT, today

RAW = os.path.join(ROOT, "data", "sale-raw.json")
SALE = os.path.join(ROOT, "data", "sale.json")

# 商品ページ（/dp/ASIN）の形でないリンクの対応（短縮リンクの行き先・案件の専用リンク）。2026-11-27に確認
LINK_ASIN = {
    "https://amzn.to/4mSIpY5": "B0FHQFBQSM",
    "https://amzn.to/4oPIFtb": "B0F66LKTV6",
    "https://amzn.to/3YiCORy": "B0DJLDCY8F",
}
# 同じリンクに複数の商品がぶら下がるもの（リンク, アイテム名）→ ASIN
ITEM_ASIN = {
    ("https://ecovacs.band/a0017d", "ECOVACS WINBOT mini 2"): "B0GVDKNGQB",
    ("https://ecovacs.band/a0017d", "ECOVACS WINBOT W2S PRO OMNI"): "B0H9RVW5X7",
}


def asin_of(item):
    link = (item.get("links") or {}).get("amazon") or ""
    key = (link, item.get("name"))
    if key in ITEM_ASIN:
        return ITEM_ASIN[key]
    if link in LINK_ASIN:
        return LINK_ASIN[link]
    m = re.search(r"/dp/([A-Z0-9]{10})", link)
    return m.group(1) if m else None


# カテゴリは投稿のもの。「カバンの中身」などアイテムの種類を表さないものは後回しにし、紹介した投稿の中で一番多いものを使う
GENERIC = ("カバンの中身", "日常・Vlog", "その他")
# それでも決まらない・合わないものは、ここでASINごとに決める
CATEGORY = {
    "B0F1Y3CJJ2": "オーディオ",        # Shokz OpenFit2+（カバンの中身の投稿だけで紹介）
    "B0CG19FGQ5": "カメラ・映像",      # DJI Osmo Pocket 3
    "B0FY56RRHX": "バッグ・小物",      # Clipa バックハンガー
    "B0F8BWQD33": "PC・周辺機器",      # ONED Majextand（ノートPCスタンド）
    "B0D73JBJ56": "PC・周辺機器",      # Anker Prime Charger
    "B0GWMRRG93": "スマホ・タブレット",  # MATECH Qi2 モバイルバッテリー
    "B0H3C1WB2C": "スマホ・タブレット",  # MATECH MagOn 5000mAh
    "B0HJB1CR9Q": "ウェアラブル",      # Apple Watch SE3
    "B0794NVLZF": "カメラ・映像",      # INPON カメラストラップ
}


def category_of(asin, posts):
    if asin in CATEGORY:
        return CATEGORY[asin]
    cats = [p["category"] for p in posts if p.get("category")]
    pick = [c for c in cats if c not in GENERIC] or cats
    if not pick:
        return "その他"
    return max(pick, key=lambda c: (pick.count(c), -pick.index(c)))


def yen(s):
    m = re.search(r"[￥¥]\s*([\d,]+)", s or "")
    return int(m.group(1).replace(",", "")) if m else None


# サイトの名前と、リンク先の商品ページの色などが違うもの（リンクは変えず、特設ページの名前だけ商品ページに合わせる）。2026-11-27に確認
NAME = {
    "B0FLYDJHB4": "Ray-Ban Meta Wayfarer (Gen 2) マットブラック / クリア",  # サイトの名前は「シャイニートランスペアレントグレー」（それは B0GQZVG4MD）
}


def site_items():
    """サイトに載せている（公開中の）アイテムを、ASINごとにまとめて返す"""
    videos = sorted((v for v in load(VIDEOS) if v.get("status") == "posted"), key=lambda v: v.get("postedDate") or "", reverse=True)
    by_asin = {}
    for v in videos:  # 新しい順。名前・画像・リンクは一番新しい投稿のものを使う
        for it in v.get("items", []):
            a = asin_of(it)
            if not a:
                continue
            g = by_asin.setdefault(a, {"item": it, "video": v, "posts": []})
            if v["id"] not in [p["id"] for p in g["posts"]]:
                g["posts"].append({"id": v["id"], "title": v["title"], "postedDate": v.get("postedDate"), "pr": bool(v.get("pr")), "category": v.get("category")})
    return by_asin


def main():
    checked = sys.argv[1] if len(sys.argv) > 1 else today()
    raw = {r["asin"]: r for r in load(RAW)}
    by_asin = site_items()
    # 調査が途中で止まった結果で作り直すと、対象が減って見える。9割以上を調べられたときだけ書き換える
    done = sum(1 for a in by_asin if a in raw and not raw[a].get("noTitle"))
    if done < len(by_asin) * 0.9:
        print(f"調査結果が足りない（{done} / {len(by_asin)} 点）ので data/sale.json は書き換えない")
        sys.exit(1)

    items, skipped = [], []
    for a, g in by_asin.items():
        r = raw.get(a)
        if not r:
            skipped.append((a, "未確認"))
            continue
        if not r.get("badge"):
            continue
        price = yen(r.get("price"))
        if not price:
            skipped.append((a, "価格が読めない"))
            continue
        if re.search(r"在庫切れ|お取り扱いできません|入荷時期は未定", r.get("avail") or ""):
            skipped.append((a, "在庫なし"))
            continue
        if r.get("asinSel") and r["asinSel"] != a:
            skipped.append((a, f"別の商品ページに移る（{r['asinSel']}）"))
            continue
        base = yen(r.get("basis"))
        if base and base <= price:
            base = None
        label = None
        if base:
            m = re.match(r"\s*(参考価格|過去価格|過去|参考|通常価格)", r.get("basisLabel") or "")
            label = {"過去": "過去価格", "参考": "参考価格"}.get(m.group(1), m.group(1)) if m else None
        off = round((1 - price / base) * 100) if base else None
        m = re.search(r"-?\s*(\d+)\s*%", r.get("pct") or "")
        if m:
            off = int(m.group(1))
        it, v = g["item"], g["video"]
        # 画像はAmazonの商品ページのものを優先する（楽天の商品画像には楽天側の値引き表示が入っていることがあり、紛らわしいため）
        image = re.sub(r"\._[A-Za-z0-9_,]+_\.", "._AC_SX679_.", r["image"]) if (r.get("image") or "").startswith("https://m.media-amazon.com/") else (it.get("image") or r.get("image"))
        if image and not image.startswith("http"):
            image = "../" + image
        items.append({
            "asin": a,
            "name": NAME.get(a, it["name"]),
            "brand": it.get("brand") or "",
            "category": category_of(a, g["posts"]),
            "image": image or "",
            "link": it["links"]["amazon"],
            "salePrice": price,
            "basePrice": base,
            "baseLabel": label,
            "off": off,
            "badge": r["badge"],
            # 投稿の pr は「PR・提供品を含む投稿」の意味で、アイテム単位ではない。紹介した投稿がすべてPRのときだけ「PR」を付ける
            "pr": all(p["pr"] for p in g["posts"]),
            "posts": [{k: p[k] for k in ("id", "title", "postedDate")} for p in g["posts"]],
        })

    items.sort(key=lambda x: (-(x["off"] or 0), x["salePrice"]))
    sale = load(SALE) if os.path.exists(SALE) else {}
    sale["checkedAt"] = checked
    sale["items"] = items
    save(SALE, sale)
    print(f"調べた商品 {len(by_asin)} 点 / セール対象 {len(items)} 点 / 確認日 {checked}")
    unchecked = [a for a, why in skipped if why == "未確認"]
    if unchecked:
        print(f"  未確認（data/sale-raw.json に無い）: {len(unchecked)} 点")
    for a, why in skipped:
        if why != "未確認":
            print(f"  載せない: {a} {why}（{by_asin[a]['item']['name']}）")


if __name__ == "__main__":
    main()
