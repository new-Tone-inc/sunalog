# すなおのガジェログ（Instagram紹介アイテム一覧サイト）

Instagram [@simple_suna](https://www.instagram.com/simple_suna/) で紹介したショート動画と、そこで取り上げたアイテム・アフィリエイトリンクを一覧にする静的サイト。
参考イメージは [いいもの図鑑](https://iimonozukan.com)。見た目はNotion風のシンプル構成、色は動画編集のトンマナ（#3f4a52 / #a7a7a7 / #e94b25 / 白）、書体はNoto Sans JP。

## 構成

| ファイル | 役割 |
|---|---|
| `index.html` | ページ本体（「動画で探す」「アイテムを探す」の2タブ、月・カテゴリ・ショップで絞り込み、検索） |
| `assets/style.css` | 見た目 |
| `assets/app.js` | `data/videos.json` を読んで描画する |
| `data/videos.json` | **ここを編集して動画・アイテムを増やす**（正本） |
| `assets/covers/` | 動画のカバー画像（`動画編集＿Remotion/99_完成/カバー/*.jpg` を動画の `id` 名にしてコピー） |

## ローカルで見る

`fetch` でJSONを読むため、ファイルを直接開くのではなく簡易サーバーで見る。

```bash
python3 -m http.server 8787
```

→ http://localhost:8787/

## 動画を1本追加する

`data/videos.json` の配列に1件追加する。

```json
{
  "id": "instax-pal-2",
  "title": "instax Pal 2",
  "status": "posted",
  "postedDate": "2026-10-19",
  "instagramUrl": "https://www.instagram.com/reel/XXXX/",
  "youtubeUrl": null,
  "cover": "instax_Pal2.jpg",
  "hook": "チェキなのに、プリントできないんよ📷",
  "caption": "キャプション全文",
  "hashtags": ["#instaxPal2"],
  "category": "カメラ・映像",
  "items": [
    {
      "name": "FUJIFILM instax Pal 2",
      "brand": "FUJIFILM",
      "price": "オープン価格（店頭想定価格 25,300円・2026年10月19日時点）",
      "officialUrl": "https://www.fujifilm.com/jp/ja/consumer/instax/cameras/pal2/",
      "note": null,
      "links": {
        "amazon": "https://amzn.to/xxxx",
        "rakuten": "https://a.r10.to/xxxx",
        "yahoo": null
      }
    }
  ]
}
```

- `category` は次のどれか: `カメラ・映像` / `スマホ・タブレット` / `オーディオ` / `PC・周辺機器` / `ウェアラブル` / `家電` / `カバンの中身` / `バッグ・小物` / `日常・Vlog` / `その他`
- `pr: true` にすると、カードと詳細に「PR」の表示が出る（提供品・#PRの投稿）
- `links` の `amazon` / `rakuten` / `yahoo` にアフィリエイトリンクを入れると、そのボタンが出る。空（`null`）なら出ない
- `officialUrl` は公式サイト。`links.official` でも可
- `cover` は `assets/covers/` に置いたファイル名。無ければタイトル文字のカードになる
- `postedDate` から「紹介した月」の絞り込みが自動で作られる。投稿から14日以内は NEW が付く

## 公開する

静的ファイルだけなので、このフォルダをそのまま GitHub Pages / Netlify / Cloudflare Pages に置けば公開できる。

## 表示の決まり

- `status` が `posted` の動画だけを表示する。`hidden` は製品が無い投稿（サイトに出さない）。編集済みでまだ投稿していない動画（`finished`）はデータに残しておけるが、サイトには出ない。投稿したら `posted` に変え、`postedDate` と `instagramUrl` を入れる

## Instagramの埋め込み

詳細画面の「動画を再生」を押すと、`instagramUrl` + `embed/` をiframeで読み込んで、その場で動画を再生する。
公開アカウントの投稿だけ再生できる。開いたときに毎回読み込むと重いので、ボタンを押したときだけ読み込む。

## 公開先（2026-10-28）

- 公開URL: https://sunalog.newtone-inc.jp （new-Toneのドメインのサブドメイン。もっくん承認済み）
- ホスティング: GitHub Pages（リポジトリ `new-Tone-inc/sunalog`、mainブランチのルートを公開）
- DNS: `sunalog` の CNAME → `new-tone-inc.github.io`（もっくんが設定。ClickUp: https://app.clickup.com/t/1100350000014448/z8rcten098 ）
- `CNAME` ファイルと `.nojekyll` はPages用。消さない
- 更新手順: このフォルダで `videos.json` 等を直して `git add` → `git commit` → `git push origin main`。数分で反映される
- DNSの注意: newtone-inc.jp はお名前.com（dnsv.jp）で、`*.newtone-inc.jp` のワイルドカードがVercelに向いている。`sunalog` を明示的にCNAMEで追加すればワイルドカードより優先される
- HTTPSの強制（Enforce HTTPS）は、DNSが通って証明書が発行されたあとに `gh api -X PUT repos/new-Tone-inc/sunalog/pages -F https_enforced=true` で有効にする

## アイテム画像（2026-10-28）

- 各アイテムの `image` は、楽天の商品画像（アフィリエイトのリンク作成で出る画像と同じ）を優先し、無ければ公式サイトのOG画像、Amazonの商品画像の順。URLを参照するだけで、画像ファイルはこのリポジトリに保存しない
- 画像が無いアイテムは、紹介した動画のサムネイル（カバー）を「動画」の印つきで代わりに出す。それも無ければブランドの頭文字
- 元データは `data/instagram/image-sources.json`

## 詳細画面の操作と「こちらもどうぞ」（2026-10-28）

- 動画の詳細を開くたびにブラウザの履歴を1つ積む。スマホの「戻る」（ブラウザの戻る）で詳細を閉じて一覧へ戻れる。詳細の中から別の動画を開いた場合も、戻るで1つ前の動画へ戻る
- スマホでは右上の「×」を画面に固定し、どこまでスクロールしても閉じられる。詳細の最下部にも「← 一覧に戻る」がある
- 詳細の下部「こちらもどうぞ」は関連動画（最大6本）。定義は **同じブランドのアイテムを紹介している動画** と **同じカテゴリの動画**（両方当てはまるものを先に、同点なら投稿日が近い順）。`assets/app.js` の `relatedVideos()` で変えられる

## 2026-10-28 の追加分

- **検索欄**: 枠内の説明文（動画名・アイテム名で検索）は外した。ラベル「検索」だけ
- **アイテムの統合**: 同じアイテムを複数の動画で紹介していても、「アイテムを探す」では1枚にまとめ、紹介した動画を複数ぶら下げる。まとめる単位は `item.key`（データで明示。表記ゆれがある製品に付けてある）か、無ければ「ブランド+名前」から記号・空白を除いた文字列。345点 → 200点。`data/videos.json` 自体は動画ごとのままで、まとめるのは表示時だけ
- **今話題の製品**（2026-11-26追加）: 「人気の動画」の上に、指定した投稿を大きく出す枠。`assets/config.js` の `featured` に `{ id, until, note, cta }` を書く。`id` は `data/videos.json` の投稿ID、`until` は表示の最終日（`YYYY-MM-DD`。日本時間でその日の終わりまで出て、翌日から自動で消える）、`note` は見出しの下の一言、`cta` は追加のリンクボタン（`label`・`url`）。投稿が `pr: true` なら枠に「PR」が出る。`featured` が空・期限切れ・IDが無いときは枠ごと出ない。期限が過ぎた行は残っていても害は無いが、次に触るときに消してよい。`assets/config.js` を変えたら `index.html` の `config.js?v=` の数字も上げる（古い設定が残らないように）
  - 提供元から渡されたリンク（例 `https://ecovacs.band/…`。AmazonのECOVACSストアへ転送）は、アイテムの `links.amazon` にそのまま入れる。自分のアフィリエイトタグのリンクへ置き換えない。新しいドメインを使うときは `tools/validate.py` のAmazonリンクの形に足す
- **人気の動画**: タブの上に、直近3ヶ月の投稿を「いいね＋保存数」の多い順に最大8本（2026-11-24から3ヶ月で試験運用中。それまでは直近1年。期間は `assets/config.js` の `popularMonths` で変える）。数値は各動画の `stats`（`likes` / `saves` / `comments` / `asOf`）。Instagramのインサイト画面（自分のアカウントでログインした状態で `https://www.instagram.com/insights/media/{メディアID}/`）から取った。メディアIDはリールのコードを64進数で読んだもの。更新するときは同じ手順で `stats` を書き換える
- **フィルタ**: 並びはカテゴリ → ショップ → 紹介した年。年を選ぶと、その年の月が下に出る
- **ページ送り**: 動画もアイテムも10件ずつ。「← 前へ / 1 2 … / 次へ →」で切り替え。フィルタやタブを変えると1ページ目に戻る
- **フォロワー数と目標**: 一覧の下の枠。`data/social.json` の `followers` が入っているSNSだけ表示する。`featured: true` のSNS（Instagram）を大きくメイン表示。目標: Instagram 50,000 / TikTok 20,000 / YouTube 10,000、Threads 20,000（すなお、2026-10-28）。`goal` を入れると目標までの残りと進み具合（%）が出る。数値は手で更新する（`asOf` も合わせて直す）
- **埋め込み動画の音**: 詳細を閉じたときに中身（iframe）を消して、再生を止めるようにした

## セールの特設ページ（2026-11-27追加。Amazonブラックフライデー 2026）

サイトに載せているアイテムのうち、Amazonでセール表示が出ているものだけを並べるページ。URLは `https://sunalog.newtone-inc.jp/blackfriday/`。

- **ファイル**: ページは `blackfriday/index.html`、動きは `assets/sale.js`、見た目は `assets/style.css` の「セールの案内」の所、データは `data/sale.json`
- **トップの帯**: `assets/config.js` の `sale`（`title`・`text`・`url`・`until`）。`until` の日（日本時間）の終わりまで、トップの一番上に赤い帯で出る。件数は `data/sale.json` から自動で入る。クリックは `sale_banner_click` イベントで数える
- **終了後**: `data/sale.json` の `until` を過ぎると、特設ページは「このセールは終了しました」だけになり、トップの帯も消える。ファイルは残してよい
- **載せる条件**: Amazonの商品ページにセールのバッジ（先行セール・厳選目玉商品・タイムセールなど）が出ていて、価格が読め、在庫があるもの。値引き率（-○%）だけでバッジが無いものは、ふだんから出ている表示なので載せない
- **価格の扱い**: セール価格・参考価格／過去価格・割引率は、確認した日の商品ページの表示をそのまま載せる。ページの上に確認日を出している（`checkedAt`）
- **「PR」の表示**: 紹介した投稿がすべて `pr: true` のアイテムにだけ付く（投稿の `pr` は「PR・提供品を含む投稿」の意味で、アイテム単位の情報ではないため）
- **計測**: Amazonへのクリックは `affiliate_click`（`view` が `sale`）。並び順の変更は `sale_sort`
- **共有**（2026-11-27追加）: ページの上と下に「共有」ボタン。スマホは共有シート、それ以外はリンクのコピー。共有されるURLは `https://sunalog.newtone-inc.jp/blackfriday/?utm_source=share&utm_medium=referral&utm_campaign=sale`（共有リンクから来た人を Google アナリティクスで区別できる）。押した回数は `share` イベント（`post_id` が `sale:amazon-black-friday-2026`）
- **共有したときの画像**: `assets/brand/og-blackfriday-2026.jpg`（1200×630）。元は `tools/sale_og.html`。作り直すときは、作業フォルダで `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --user-data-dir=/tmp/sunalog/chrome-headless --window-size=1200,630 --screenshot=/tmp/sunalog/sale-og.png "file://$PWD/tools/sale_og.html"` → `sips -s format jpeg -s formatOptions 88 /tmp/sunalog/sale-og.png --out assets/brand/og-blackfriday-2026.jpg`。`assets/og/` は投稿用で `share_pages.py` が掃除するので、そこには置かない。LINEやXは画像をしばらく覚えているので、差し替えたらファイル名を変える

### 調べ直す手順（セール中は毎日21時の自動更新が行う。2026-11-27〜12-07）

毎日21時の自動更新（`tools/DAILY_UPDATE.md` の 0b・3b）が、価格とセール対象を毎日調べ直す（すなおの希望、2026-11-27）。12/8以降は `tools/sale_raw.py asins` が「セールは終了」を返すので、自動で飛ばされる。手で調べ直すときも同じ手順でよい。

1. `python3 tools/sale_raw.py asins` → 調べるASINの一覧（サイトに載せている公開中のアイテム。`/dp/ASIN` のリンクと、`tools/sale_build.py` の `LINK_ASIN`・`ITEM_ASIN` にある短縮リンク・案件リンク）
2. ブラウザで `https://www.amazon.co.jp/blackfriday` を開き、`tools/sale_check.js` の中身をそのページで実行して、`window.__saleCheck([...])` に一覧を渡す（1件に5秒ほど。約190件で15〜20分。ログイン情報は送らない）
3. `window.__saleState` が `done` になったら、`window.__saleCompact(0, 50)` のように50件ずつ取り出してファイルに書き、`python3 tools/sale_raw.py merge <ファイル...>` で `data/sale-raw.json` にまとめる
4. `python3 tools/sale_build.py` で `data/sale.json` の `items` と `checkedAt` を作り直す（調べられたのが9割未満なら書き換えない）。カテゴリが合わないものは `tools/sale_build.py` の `CATEGORY` に ASIN ごとに書く
5. `python3 tools/validate.py` → `data/sale.json` `data/sale-raw.json` を commit・push

文字認証（CAPTCHA）や 503 が出たら自動で止まる。回避はせず、時間を置いてやり直す。

### 次のセールで使い回すとき

`blackfriday/` を別の名前でコピーし、`data/sale.json` の `id`・`title`・`periods`・`until`・`venue` と、`assets/config.js` の `sale` を書き換える（`assets/sale.js` は `../data/sale.json` を読む。セールを同時に2つ出すなら、読むファイル名を分ける改修が要る）。

## 毎日21時の自動更新（2026-10-28〜。11-04までは毎朝5時）

Claude Codeの定時タスク「サイト更新＋インサイト記録」が毎日21時に [tools/DAILY_UPDATE.md](tools/DAILY_UPDATE.md) の手順で動く（Claudeアプリが開いていて、ChromeがInstagramにログインしている必要がある。閉じていれば次に開いたときに動く）。
やること: 新しい投稿の追加（アイテム・リンク・カバー）→ 直近30日（日曜は1年）のいいね・保存数の取り直し → 4SNSのフォロワー数 → 検査 → push。結果は `Personal/Sunao/ガジェログ日次レポート/YYYY-MM-DD.md`。
補助スクリプトは `tools/`（`new_reels.py` 未登録の投稿を出す / `add_videos.py` 下書きを追加しカバー保存 / `insights_targets.py` 取り直す投稿一覧 / `stats_merge.py` / `social_update.py` / `item_images.py` / `validate.py` 公開前検査）。

## アイコン・OG画像（2026-10-28）

`assets/brand/sunalog-character.jpg`（すなおのイラスト）から `tools/make_icons.py` で作る: favicon（ico/16/32）、apple-touch-icon（180）、manifest用（192/512）、ヘッダーのマーク（`mark-128.png`）、SNS共有用の `og-image.png`（1200×630、「SunaLog」の文字入り）。
`site.webmanifest` の `short_name` は「SunaLog」（ホーム画面に追加したときの名前）。作り直すときは Pillow を入れた Python と Noto Sans JP のフォント（`/tmp/sunalog/NotoSansJP.ttf`、Google Fonts の GitHub から取得）が要る。
- `index.html` の `style.css` / `app.js` の読み込みには `?v=日時` を付けている（ブラウザの古いキャッシュ対策）。CSS/JSを変えたら `?v=` の値も変える
- ヘッダー右上は Instagram / TikTok / YouTube / Threads のアイコン（インラインSVG）。それぞれ @simple_suna のプロフィールへ飛ぶ（2026-10-28）
- 「人気の動画」は3秒ごとに1枚ずつ右へ自動で送る（端で先頭へ戻る）。触っている間・マウスを乗せている間・詳細を開いている間・画面外では止まる。`assets/app.js` の `startPopularAutoScroll()`

### フィルタのチップ表示（2026-10-28）

- スマホ幅でも、カテゴリ・ショップ・紹介した年のチップは横スクロールにせず折り返して全部表示する（カテゴリ11個で4〜5行）
- 選択中のチップはブランドの赤（#e94b25）。以前の濃いグレーはダークモードでフィルタ枠の背景と同色になり、選択状態が見えなかった
- チップの枠線は `--chip-line`（ライト #cfd4d8 / ダーク #6b767e）で、背景とのコントラストを確保している

### 2024年の投稿の取り込み（2026-10-28〜）

- 2024年のリール93本を、毎日の自動更新で新しい順に10本ずつ載せていく（2026-10-29に5本→10本へ）（`tools/DAILY_UPDATE.md` の 1b、対象は `tools/backfill_targets.py` が出す）。初回（10-28）は2024年12月の10本、第2回（10-29）は9〜10月の15本を手で取り込んだ
- 本文に製品名が無く動画の中だけで紹介している投稿（ベストバイ、カバンの中身、VLOG）は `itemsPending: true` で載せ、カードは「アイテムは動画内で紹介」、詳細は「一覧は準備中」と出す。本人からアイテムを聞いて順次埋める
- 2024年の投稿にはインサイト（いいね・保存）は付けない。「人気の動画」は直近3ヶ月（試験運用前は直近1年）の投稿だけが対象なので影響しない

## アクセス計測（Google アナリティクス 4。2026-11-04〜、11-25に3点追加）

測定IDは `assets/config.js` の `gaId`。読み込みは `index.html` の先頭のスクリプト。ローカルと claude.ai のプレビューでは計測しない。

### 自分のアクセスを数えない（2026-11-25）

- `https://sunalog.newtone-inc.jp/?notrack=1` を1回開くと、その端末・そのブラウザは計測から外れる（ブラウザに覚えさせる。フッターに「計測の対象から外しています」と出る）
- 戻すときは `?notrack=0` を開く
- 覚えるのはブラウザごと。Safari・Chrome・Instagramのアプリ内ブラウザは別々なので、使うものそれぞれで1回ずつ開く
- 表示の確認で本番を開くとき（Claudeの確認を含む）は、URLに `?notrack=1` を付けて開く

### 入口を区別するURL（2026-11-25）

SNSに貼るURLは、貼る場所ごとに下のものを使う。Google アナリティクスの「トラフィック獲得」で、参照元（`utm_source`）とキャンペーン（`utm_campaign`）として分かれて出る。

| 貼る場所 | URL |
|---|---|
| Instagram プロフィール | `https://sunalog.newtone-inc.jp/?utm_source=instagram&utm_medium=social&utm_campaign=profile` |
| Instagram ストーリーズ | `https://sunalog.newtone-inc.jp/?utm_source=instagram&utm_medium=social&utm_campaign=story` |
| Threads プロフィール | `https://sunalog.newtone-inc.jp/?utm_source=threads&utm_medium=social&utm_campaign=profile` |
| TikTok プロフィール | `https://sunalog.newtone-inc.jp/?utm_source=tiktok&utm_medium=social&utm_campaign=profile` |
| YouTube チャンネル・概要欄 | `https://sunalog.newtone-inc.jp/?utm_source=youtube&utm_medium=social&utm_campaign=profile` |

- 特定の投稿へ飛ばすときは、末尾に `#投稿のID` を付ける（例: `…&utm_campaign=story#nitori-omamori-light`）
- 共有ボタンのリンク（`/p/{id}`）から来た人は、`tools/share_pages.py` が作るページが `utm_source=share` を付けてトップへ送る

### 投稿をどこから開いたか（2026-11-25）

`post_open` イベントに `open_from` を付けている。値は `featured`（今話題の製品。2026-11-26追加）／`popular`（人気の動画）／`list`（動画の一覧）／`items`（アイテムの一覧）／`related`（こちらもどうぞ）／`link`（URLを直接開いた・共有リンク）／`back`（戻る・進む）。
Google アナリティクスで見るには、カスタム ディメンション（イベント スコープ、イベント パラメータ `open_from`）の登録が要る。
