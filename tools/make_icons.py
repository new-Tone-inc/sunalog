"""assets/brand/sunalog-character.jpg から、サイトのアイコン一式とOG画像を作る。
実行: /tmp/sunalog/venv/bin/python tools/make_icons.py （Pillow が要る。フォントは /tmp/sunalog/NotoSansJP.ttf）
出力: assets/brand/icon-512.png, icon-192.png, apple-touch-icon.png(180), favicon-32.png, favicon-16.png, favicon.ico, mark-128.png, og-image.png(1200x630)
"""
from PIL import Image, ImageDraw, ImageFont
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = os.path.join(ROOT, "assets", "brand")
SRC = Image.open(os.path.join(B, "sunalog-character.jpg")).convert("RGB")
BG = (245, 245, 245)       # 元画像の背景色
DARK = (63, 74, 82)        # #3f4a52
RED = (233, 75, 37)        # #e94b25
GRAY = (167, 167, 167)     # #a7a7a7
FONT = "/tmp/sunalog/NotoSansJP.ttf"
def font(size, weight=700):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_axes([weight]); return f

# 人物の範囲（背景色でない画素）: 元画像では x 114..384, y 100..498（下端で切れている）
fig = SRC.crop((100, 88, 400, 500))   # 少し余白を含めて切り出す（幅300×高さ412）

def square_icon(size, head_only=False):
    """正方形アイコン。人物を下端にそろえて置く（元画像も下で切れているため自然に見える）"""
    canvas = Image.new("RGB", (size, size), BG)
    if head_only:
        # 小さいサイズは顔とカメラだけ（元画像 y 100..330 あたり）
        part = SRC.crop((110, 92, 395, 345))
        scale = size / part.width
        part = part.resize((size, round(part.height * scale)), Image.LANCZOS)
        canvas.paste(part, (0, size - part.height if part.height < size else 0))
        return canvas
    target_h = round(size * 0.94)
    scale = target_h / fig.height
    f = fig.resize((round(fig.width * scale), target_h), Image.LANCZOS)
    canvas.paste(f, ((size - f.width) // 2, size - f.height))
    return canvas

icon512 = square_icon(512); icon512.save(os.path.join(B, "icon-512.png"), optimize=True)
square_icon(192).save(os.path.join(B, "icon-192.png"), optimize=True)
square_icon(180).save(os.path.join(B, "apple-touch-icon.png"), optimize=True)
square_icon(128).save(os.path.join(B, "mark-128.png"), optimize=True)
f32 = square_icon(32, head_only=True); f32.save(os.path.join(B, "favicon-32.png"), optimize=True)
f16 = square_icon(16, head_only=True); f16.save(os.path.join(B, "favicon-16.png"), optimize=True)
square_icon(48, head_only=True).save(os.path.join(B, "favicon-48.png"), optimize=True)
Image.open(os.path.join(B, "favicon-48.png")).save(os.path.join(B, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

# OG画像 1200×630: 左に人物、右に SunaLog の文字
W, H = 1200, 630
og = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(og)
ph = 560
scale = ph / fig.height
person = fig.resize((round(fig.width * scale), ph), Image.LANCZOS)
og.paste(person, (90, H - ph))
x0 = 90 + person.width + 60
# 見出し SunaLog
f1 = font(116, 800)
d.text((x0, 150), "SunaLog", font=f1, fill=DARK)
# オレンジの下線（アクセント）
bbox = d.textbbox((x0, 150), "SunaLog", font=f1)
d.rounded_rectangle((x0, bbox[3] + 18, x0 + 120, bbox[3] + 30), radius=6, fill=RED)
# 日本語名
f2 = font(44, 700)
d.text((x0, bbox[3] + 62), "すなおのガジェログ", font=f2, fill=DARK)
f3 = font(26, 500)
d.text((x0, bbox[3] + 134), "Instagram @simple_suna で紹介した", font=f3, fill=(96, 106, 112))
d.text((x0, bbox[3] + 172), "ショート動画とガジェットの一覧", font=f3, fill=(96, 106, 112))
f4 = font(24, 500)
d.text((x0, H - 90), "sunalog.newtone-inc.jp", font=f4, fill=GRAY)
og.save(os.path.join(B, "og-image.png"), optimize=True)
print("ok", sorted(os.listdir(B)))
