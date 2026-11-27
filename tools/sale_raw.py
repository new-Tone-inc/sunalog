#!/usr/bin/env python3
"""セール調査の入口と出口（毎日の自動更新 3b と、手で調べ直すときに使う）。

  python3 tools/sale_raw.py asins
      調べるASINの一覧（JSONの配列）を出す。セールの最終日（data/sale.json の until）を過ぎていたら何も出さず終了コード2
  python3 tools/sale_raw.py merge <chunk.json> [<chunk.json> ...]
      ブラウザで集めた結果（tools/sale_check.js の window.__saleCompact が返す配列）を data/sale-raw.json にまとめる
      調べられなかったASINがあれば一覧を出す（そのぶんは前回の結果を残さない。足りなければ sale_build.py が書き換えを止める）
"""
import datetime
import json
import os
import sys

from common import load, ROOT
from sale_build import RAW, SALE, site_items

IMG = "https://m.media-amazon.com/images/I/"


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "asins":
        until = (load(SALE) if os.path.exists(SALE) else {}).get("until") or ""
        if not until or datetime.date.today().isoformat() > until:
            print(f"セールは終了（until: {until or '未設定'}）。調べ直しは不要", file=sys.stderr)
            sys.exit(2)
        print(json.dumps(list(site_items().keys())))
    elif cmd == "merge" and len(sys.argv) > 2:
        out = {}
        for f in sys.argv[2:]:
            for r in load(f):
                if len(r) >= 9:
                    asin, price, basis, label, pct, badge, avail, same, img = r[:9]
                    out[asin] = {"asin": asin, "price": price, "basis": basis, "basisLabel": label, "pct": pct, "badge": badge, "avail": avail,
                                 "asinSel": asin if same == 1 else same, "image": (IMG + img) if img and not img.startswith("http") else (img or None)}
                else:
                    asin, nt, pct, avail = r[:4]
                    out[asin] = {"asin": asin, "badge": None, "pct": pct or None, "avail": avail, "noTitle": nt == "NT"}
        with open(RAW, "w", encoding="utf-8") as fp:
            json.dump(list(out.values()), fp, ensure_ascii=False, indent=1)
            fp.write("\n")
        want = list(site_items().keys())
        missing = [a for a in want if a not in out or out[a].get("noTitle")]
        print(f"{len(out)} 件を data/sale-raw.json に保存 / セールのバッジあり {sum(1 for v in out.values() if v.get('badge'))} 件 / 調べられなかった {len(missing)} 件")
        if missing:
            print("  調べられなかったASIN:", " ".join(missing[:20]), "…" if len(missing) > 20 else "")
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
