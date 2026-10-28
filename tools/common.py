"""毎日更新で使う共通処理。すべて data/videos.json を正本として読む・書く。"""
import json, re, os, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS = os.path.join(ROOT, "data", "videos.json")
REELS = os.path.join(ROOT, "data", "instagram", "reels-list.json")
SOCIAL = os.path.join(ROOT, "data", "social.json")
COVERS = os.path.join(ROOT, "assets", "covers")
CATEGORIES = ["カメラ・映像", "スマホ・タブレット", "オーディオ", "PC・周辺機器", "ウェアラブル", "家電", "カバンの中身", "バッグ・小物", "日常・Vlog", "その他"]
AMAZON_TAG = "simplesuna-22"
RAKUTEN_PREFIX = "https://hb.afl.rakuten.co.jp/ichiba/38aa89e0.03177640.38aa89e1.454ff307/?pc="
RAKUTEN_SUFFIX = "&link_type=text&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJ0ZXh0Iiwic2l6ZSI6IjEwMHgxMDAiLCJuYW0iOjEsIm5hbXAiOiJyaWdodCIsImNvbSI6MSwiY29tcCI6ImRvd24iLCJwcmljZSI6MSwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9"
SHORTCODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def today():
    return datetime.date.today().isoformat()

def shortcode_to_media_id(code):
    n = 0
    for ch in code:
        n = n * 64 + SHORTCODE_ALPHABET.index(ch)
    return str(n)

def reel_code(url):
    m = re.search(r"/(?:reel|p)/([A-Za-z0-9_-]+)", url or "")
    return m.group(1) if m else None

def amazon_link(asin):
    return f"https://www.amazon.co.jp/dp/{asin}?tag={AMAZON_TAG}"

def rakuten_link(item_url):
    from urllib.parse import quote
    return RAKUTEN_PREFIX + quote(item_url, safe="") + RAKUTEN_SUFFIX

def slugify(text, fallback):
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s[:40] or fallback
