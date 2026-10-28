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
- **人気の動画**: タブの上に、直近1年の投稿を「いいね＋保存数」の多い順に最大8本。数値は各動画の `stats`（`likes` / `saves` / `comments` / `asOf`）。Instagramのインサイト画面（自分のアカウントでログインした状態で `https://www.instagram.com/insights/media/{メディアID}/`）から取った。メディアIDはリールのコードを64進数で読んだもの。更新するときは同じ手順で `stats` を書き換える
- **フィルタ**: 並びはカテゴリ → ショップ → 紹介した年。年を選ぶと、その年の月が下に出る
- **ページ送り**: 動画もアイテムも10件ずつ。「← 前へ / 1 2 … / 次へ →」で切り替え。フィルタやタブを変えると1ページ目に戻る
- **フォロワー数と目標**: 一覧の下の枠。`data/social.json` の `followers` が入っているSNSだけ表示する。`featured: true` のSNS（Instagram）を大きくメイン表示。目標: Instagram 50,000 / TikTok 20,000 / YouTube 10,000、Threads 20,000（すなお、2026-10-28）。`goal` を入れると目標までの残りと進み具合（%）が出る。数値は手で更新する（`asOf` も合わせて直す）
- **埋め込み動画の音**: 詳細を閉じたときに中身（iframe）を消して、再生を止めるようにした

## 毎朝5時の自動更新（2026-10-28〜）

Claude Codeの定時タスク「サイト更新＋インサイト記録」が毎朝5時に [tools/DAILY_UPDATE.md](tools/DAILY_UPDATE.md) の手順で動く（Claudeアプリが開いていて、ChromeがInstagramにログインしている必要がある。閉じていれば次に開いたときに動く）。
やること: 新しい投稿の追加（アイテム・リンク・カバー）→ 直近30日（日曜は1年）のいいね・保存数の取り直し → 4SNSのフォロワー数 → 検査 → push。結果は `Personal/Sunao/ガジェログ日次レポート/YYYY-MM-DD.md`。
補助スクリプトは `tools/`（`new_reels.py` 未登録の投稿を出す / `add_videos.py` 下書きを追加しカバー保存 / `insights_targets.py` 取り直す投稿一覧 / `stats_merge.py` / `social_update.py` / `item_images.py` / `validate.py` 公開前検査）。
