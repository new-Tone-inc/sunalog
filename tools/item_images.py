"""画像が無いアイテムの商品画像を、リンク先（楽天 → 公式 → Amazon）の og:image 等から取ってくる。使い方: python3 tools/item_images.py"""
import re, subprocess, html, concurrent.futures as cf
from urllib.parse import unquote
from common import load, save, VIDEOS
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36"
def get(u):
    return subprocess.run(["curl", "-sL", "-m", "25", "-A", UA, u], capture_output=True, text=True, errors="ignore").stdout
def og(h):
    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', h) or re.search(r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', h)
    return html.unescape(m.group(1)) if m else None
def amz(h):
    m = re.search(r'"hiRes":"(https://m\.media-amazon\.com/images/I/[^"]+)"', h) or re.search(r'"large":"(https://m\.media-amazon\.com/images/I/[^"]+)"', h) or re.search(r'id="landingImage"[^>]+src="(https://m\.media-amazon\.com/images/I/[^"]+)"', h)
    return m.group(1) if m else None
videos = load(VIDEOS)
jobs = []
for v in videos:
    for it in v.get("items", []):
        if it.get("image"): continue
        l = it.get("links") or {}
        srcs = []
        if l.get("rakuten"):
            m = re.search(r"pc=([^&]+)", l["rakuten"]); srcs.append(("rakuten", unquote(m.group(1)) if m else l["rakuten"]))
        if it.get("officialUrl") or l.get("official"): srcs.append(("official", it.get("officialUrl") or l.get("official")))
        if l.get("amazon"): srcs.append(("amazon", l["amazon"].split("?")[0]))
        if srcs: jobs.append((it, srcs))
def work(job):
    it, srcs = job
    for kind, u in srcs:
        try:
            h = get(u); img = amz(h) if kind == "amazon" else og(h)
            if img:
                if kind == "rakuten" and "_ex=" not in img: img += ("&" if "?" in img else "?") + "_ex=300x300"
                return it, kind, img
        except Exception: pass
    return it, None, None
n = 0
with cf.ThreadPoolExecutor(8) as ex:
    for it, kind, img in ex.map(work, jobs):
        if img: it["image"] = img; it["imageSource"] = kind; n += 1
save(VIDEOS, videos)
print(f"画像を付けた: {n} / 対象 {len(jobs)}")
