# 毎朝の自動更新 手順書（すなおのガジェログ）

毎朝5時に、定時タスク「サイト更新＋インサイト記録」が本書の通りに動く。人が手で更新するときも同じ手順でよい。
サイトの正本は `data/videos.json`・`data/social.json`。公開は GitHub Pages（`git push` で反映、https://sunalog.newtone-inc.jp）。

## 前提・守ること
- 作業フォルダ: `/Users/sunao/Knowledge/Personal/Sunao/ガジェットWEB`（独立したgitリポジトリ。Knowledgeリポジトリとは別）
- Instagramは **読むだけ**（いいね・保存・フォロー・投稿・設定変更・「…」メニュー・宣伝ボタンは押さない。ログイン画面やCAPTCHAが出たら止めて記録する）
- Instagramのページ読み込みは1回ごとに3秒以上あける。`/api/v1/...` は直接叩かない（429になる）
- 推測で埋めない。取れなかった数値は前回の値のまま残し、報告に「取得できず」と書く
- Chromeのタブは終わったら閉じる
- `git add` は対象ファイルを明示する（`git add .` / `-A` は使わない）

## 使う道具
- Claude in Chrome（`mcp__claude-in-chrome__*`。最初に ToolSearch で `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__browser_batch` を読み込む）
- `tools/` の補助スクリプト（Python 3、追加ライブラリ不要）。実行は必ず作業フォルダから `python3 tools/xxx.py`
- 一時ファイルは `/tmp/sunalog/`（無ければ作る）

## 0. 準備
```bash
cd "/Users/sunao/Knowledge/Personal/Sunao/ガジェットWEB" && git status --short && git pull --rebase -q origin main && mkdir -p /tmp/sunalog
```
ローカルに未コミットの変更があれば触らず、報告に書いて先へ進む（その変更は含めない）。

## 1. 新しい投稿を見つける
1. Chromeで `https://www.instagram.com/simple_suna/reels/` を開き、8秒待つ。JS:
   ```js
   JSON.stringify([...new Set([...document.querySelectorAll('a[href*="/reel/"]')].map(a=>(a.getAttribute('href').match(/\/reel\/([A-Za-z0-9_-]+)/)||[])[1]).filter(Boolean))].slice(0,24))
   ```
   （先頭3件はピン留めで古いことがある。全部渡してよい）
2. 結果を `/tmp/sunalog/codes.json` に書き、`python3 tools/new_reels.py /tmp/sunalog/codes.json` → 未登録の投稿が出る。無ければ「新しい投稿なし」で 2 へ
3. 未登録の各投稿について `https://www.instagram.com/p/{code}/` を開き、6秒待って JS で本文と投稿日時を取る:
   ```js
   (()=>{const els=[...document.querySelectorAll('h1, span[dir="auto"], div[dir="auto"]')].map(e=>e.innerText||'').filter(t=>t.length>40).sort((a,b)=>b.length-a.length); const t=els[0]||''; const lines=t.split('\n'); const i=lines.findIndex(l=>/^\d+\s*(日|時間|分|秒|週間)前$|^\d{1,2}月\d{1,2}日$|^\d{4}年\d{1,2}月\d{1,2}日$/.test(l.trim())); return JSON.stringify({time:(document.querySelector('time[datetime]')||{}).getAttribute?.('datetime'), caption: lines.slice(i+1).join('\n').trim()})})()
   ```
   本文が取れないときは「投稿のキャプション」を `get_page_text` で読む。投稿日は `time`（UTC）を日本時間（+9時間）に直して `YYYY-MM-DD`
4. **アイテムを決める**（人の判断が要るところ。本文を読んで判断する）
   - 本文に出てくる製品を `items` にする。`name` は「ブランド 製品名」、`brand`、`price` は本文に価格があるときだけ（「○○円（税込・2026年○月○日時点）」の形）、`note` は本文にある補足だけ
   - 製品が1つも無い投稿（考え方・日常・告知だけ）は `status: "hidden"`、`hiddenReason: "製品紹介でない投稿のため非表示（自動更新 YYYY-MM-DD）"` にする（サイトに出さないがデータには残す）
   - `category` は `カメラ・映像 / スマホ・タブレット / オーディオ / PC・周辺機器 / ウェアラブル / 家電 / カバンの中身 / バッグ・小物 / 日常・Vlog / その他` から1つ。カバンの中身の投稿は `カバンの中身`
   - `pr` は本文に `#PR` / `提供` / `PR：` があるとき true
   - `title` は本文1行目を短く（30字以内、絵文字は外す）。`hook` は本文1行目そのまま。`hashtags` は本文中の `#…` の一覧
   - `id` は英小文字の slug（製品名ベース、例 `instax-pal-2-son`。重複時は `-YYYY-MM-DD` を付ける）
5. **リンクを付ける**（Amazon → 楽天 → 公式の順。無理に付けない）
   - Amazon: `https://www.amazon.co.jp/s?k={製品名}` を開き4秒待ち、JS:
     ```js
     JSON.stringify([...document.querySelectorAll('div[data-component-type="s-search-result"][data-asin]')].filter(d=>d.dataset.asin&&!/スポンサー|Sponsored/.test(d.innerText)).slice(0,5).map(d=>({asin:d.dataset.asin,title:(d.querySelector('h2')||{}).innerText?.trim().slice(0,80),price:(d.querySelector('.a-price .a-offscreen')||{}).textContent})))
     ```
     題名が **その製品そのもの**（型番・製品名が一致。ケース・フィルム・互換品・セット品は除く）の最初の1件のASINを使い、リンクは `https://www.amazon.co.jp/dp/{ASIN}?tag=simplesuna-22`。確信が持てなければ付けない
   - 楽天: `https://search.rakuten.co.jp/search/mall/{製品名}/` を開き4秒待ち、JS:
     ```js
     JSON.stringify([...document.querySelectorAll('a[href*="item.rakuten.co.jp/"]')].map(a=>({u:a.href.split('?')[0],t:a.innerText.trim().slice(0,70)})).filter(x=>x.t).filter((x,i,arr)=>arr.findIndex(y=>y.u===x.u)===i).slice(0,5))
     ```
     同じ基準で1件選び、`python3 -c "import sys; sys.path.insert(0,'tools'); from common import rakuten_link; print(rakuten_link('<商品URL>'))"` でアフィリエイトURLにする
   - 公式: Apple製品・Galaxy製品は公式の製品ページを必ず付ける（`officialUrl`）。それ以外は本文にURLがあるときだけ
   - Amazon・楽天に無い製品は公式だけ。限定品・100均・アプリ・販売終了はリンク無しでよい（`note` に理由）
6. 下書きを `/tmp/sunalog/draft.json`（配列）に書き、`python3 tools/add_videos.py /tmp/sunalog/draft.json` を実行（カバー画像も自動で保存される）。続けて `python3 tools/item_images.py`（商品画像）
   - 下書きの形は `tools/add_videos.py` の冒頭コメントの通り。`coverUrl` は不要（自動で取る）
   - 同じ製品を以前も紹介している場合は、既存の `item.key` を調べて同じ `key` を付ける（`grep -n '"key"' data/videos.json`）。表記が完全に同じなら key 無しでもまとまる

## 2. インサイト（投稿ごと）
1. `python3 tools/insights_targets.py --days 30 > /tmp/sunalog/targets.json`（日曜だけ `--days 365`）
2. 各 `insightsUrl` を Chrome で開き3秒待ち、JS（`browser_batch` で 10件ずつ。2タブ並行でよい）:
   ```js
   (()=>{const t=document.body.innerText;const g=(l)=>{const m=t.match(new RegExp(l+'\\n(\\d[\\d,.]*)(万?)'));if(!m)return null;let n=Number(m[1].replace(/,/g,''));if(m[2])n=Math.round(n*10000);return n};const pct=(l)=>{const m=t.match(new RegExp(l+'\\n([\\d.]+)%'));return m?Number(m[1]):null};const r={views:g('ビュー\\nビュー'),reach:g('閲覧者'),nonFollowerPct:pct('フォロワー以外'),interactions:g('インタラクション\\nインタラクション'),likes:g('「いいね！」'),comments:g('コメント'),saves:g('保存数'),shares:g('シェア数'),accounts:g('アクションを実行したアカウント'),profileActivity:g('プロフィールのアクティビティ'),follows:g('フォロー数'),ok:/保存数/.test(t)};const s=JSON.parse(localStorage.getItem('gl_ins')||'{}');s['__ID__']=r;localStorage.setItem('gl_ins',JSON.stringify(s));return JSON.stringify(r)})()
   ```
   （`__ID__` を投稿の `id` に置き換える。返り値はその場で `/tmp/sunalog/stats.json` に `{id: {...}}` の形で貯める。`ok:false` の投稿は数値を使わない）
3. `python3 tools/stats_merge.py /tmp/sunalog/stats.json`（likes・saves が数値のものだけ反映。人気の動画の並びはこの数値から自動で決まる）

## 3. フォロワー数
- Instagram（実数）: Web版の画面は「4.1万」までしか出ないので、アプリ内遷移の応答から読む。`https://www.instagram.com/` を開き5秒待ち、次のJSで応答を捕まえる仕掛けを入れる:
  ```js
  window.__all=[]; const rec=(t)=>{t=String(t); const m=t.match(/"follower_count":(\d+)/); if(m) window.__all.push(Number(m[1]));}; const ox=XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open=function(m,u,...a){this.__u=u; return ox.call(this,m,u,...a);}; const os=XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.send=function(...a){this.addEventListener('load',function(){rec(this.responseText)}); return os.apply(this,a);}; 'hooked'
  ```
  そのあと左メニューの「プロフィール」リンク（`find` で探す）を**クリック**してアプリ内で自分のプロフィールを開き、6秒待って `JSON.stringify(window.__all)` → 最初の数値がフォロワー実数（URLを直接開くとページが作り直されて捕まらないので、必ずクリックで遷移する）
- TikTok: `https://www.tiktok.com/@simple_suna` を開き4秒待ち、`meta[property="og:description"]` の「フォロワーN人」（13.4K のような概数しか出ない。K=1000倍、M=100万倍で整数にする）
- YouTube: `https://www.youtube.com/@simple_suna` を開き5秒待ち、本文の「チャンネル登録者数 N人」
- Threads: `https://www.threads.com/@simple_suna` を開き5秒待ち、`document.querySelector('span[title]').title`（最初の span[title] が自分のフォロワーの実数。カンマ区切り）
- `/tmp/sunalog/counts.json` に `{"Instagram": n, "TikTok": n, "YouTube": n, "Threads": n}` と書き、`python3 tools/social_update.py /tmp/sunalog/counts.json`

## 4. 検査・公開
```bash
cd "/Users/sunao/Knowledge/Personal/Sunao/ガジェットWEB" && python3 tools/validate.py && git add data/videos.json data/social.json data/instagram/reels-list.json assets/covers && git commit -q -m "自動更新 $(date +%Y-%m-%d): 新規○本・インサイト○本・フォロワー更新" && git push -q origin main && git log --oneline -1
```
- `validate.py` が `ok: false` なら push しない。原因を直せなければ `git checkout -- data assets` で戻し、報告に書く
- push 後1〜2分で https://sunalog.newtone-inc.jp に反映される（`curl -s https://sunalog.newtone-inc.jp/data/videos.json | head -c 200` で確かめてよい）

## 5. 報告
`/Users/sunao/Knowledge/Personal/Sunao/ガジェログ日次レポート/YYYY-MM-DD.md` に書く（フォルダが無ければ作る）:
- 新しく載せた投稿（id・タイトル・アイテム数・付けたリンク・自信が無いリンク）／非表示にした投稿と理由
- インサイトを取り直した本数、人気の動画の上位3本（前日から入れ替わったか）
- フォロワー数（4SNS、前日との差）
- 取得できなかったもの・手で直してほしいこと
最後に、要点を3行で返す（ChromeやInstagramが使えず飛ばした工程があれば、それを最初に書く）
