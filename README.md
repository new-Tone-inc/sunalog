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
- 画像が無いアイテムはブランドの頭文字のプレースホルダー。読み込みに失敗したときも同じ表示に落ちる
- 元データは `data/instagram/image-sources.json`
