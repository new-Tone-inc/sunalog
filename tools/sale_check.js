/* セール調査用（ブラウザで動かす）。Amazonの商品ページを1件ずつ読み、価格とセール表示を集める。
 *
 * 使い方（手順は README「セールの特設ページ」）:
 *   1. ブラウザで https://www.amazon.co.jp/blackfriday など amazon.co.jp のページを開く（ログインは不要）
 *   2. このファイルの中身をそのページで実行し、続けて  window.__saleCheck([ASINの配列])  を呼ぶ
 *   3. window.__saleState が "done" になったら、window.__saleCompact(0, 50) のように50件ずつ取り出してファイルに書き、
 *      python3 tools/sale_raw.py merge <ファイル...> で data/sale-raw.json にまとめる
 *
 * 守ること: 1件ごとに2.5〜3.5秒あける。文字認証（CAPTCHA）や 503/429 が出たら自動で止まる。止まったら回避せず、時間を置いてやり直す。
 * 待ち時間に Worker を使うのは、ブラウザのタブが裏にあると setTimeout が1分に1回まで遅くなるため。
 */
(function () {
  const w = new Worker(URL.createObjectURL(new Blob(["onmessage=e=>setTimeout(()=>postMessage(e.data.id),e.data.ms)"], { type: "text/javascript" })));
  const pend = new Map(); let seq = 0;
  w.onmessage = (e) => { const f = pend.get(e.data); if (f) { pend.delete(e.data); f(); } };
  const sleep = (ms) => new Promise((r) => { const id = ++seq; pend.set(id, r); w.postMessage({ id, ms }); });

  function parse(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("style,script").forEach((e) => e.remove());
    const q = (s) => { const e = doc.querySelector(s); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; };
    const cut = (s, n) => (s ? s.slice(0, n) : null);
    const title = q("#productTitle");
    const captcha = !title && /captcha|ロボットではない|画像に表示されている文字|api-services-support/i.test(html.slice(0, 8000));
    // 支払う価格・比較の価格（参考価格／過去価格）・値引き率
    const price = q("#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen") || q("#corePriceDisplay_desktop_feature_div .priceToPay") || q("#corePrice_desktop .apexPriceToPay .a-offscreen") || q("#corePrice_feature_div .a-offscreen") || q("#price_inside_buybox") || q("#apex_desktop .a-price .a-offscreen");
    const basisLabel = q("#corePriceDisplay_desktop_feature_div .basisPrice") || q("#corePrice_desktop tr:first-child");
    const basis = q("#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen") || q("#corePrice_desktop .a-text-price .a-offscreen");
    const pct = q("#corePriceDisplay_desktop_feature_div .savingsPercentage") || q("#corePrice_desktop .priceBlockSavingsString");
    // セールのバッジ（「ブラックフライデー先行セール」「厳選目玉商品」「タイムセール」など）。無ければセール対象として扱わない
    const badgeEls = [...doc.querySelectorAll("#dealBadge_feature_div span, #dealBadge_feature_div div")].map((e) => (e.children.length ? null : e.textContent.replace(/\s+/g, " ").trim())).filter(Boolean);
    const badge = badgeEls.length ? badgeEls[badgeEls.length - 1] : null;
    const asinEl = doc.querySelector("#ASIN");
    const img = doc.querySelector("#landingImage");
    return {
      title: cut(title, 90), captcha, price, basis, basisLabel: cut(basisLabel, 50), pct, badge,
      coupon: cut(q("#promoPriceBlockMessage_feature_div"), 160), avail: cut(q("#availability"), 40),
      asinSel: asinEl ? asinEl.value : null, image: img ? (img.getAttribute("data-old-hires") || img.getAttribute("src")) : null,
    };
  }

  window.__saleResults = window.__saleResults || [];
  window.__saleCheck = async function (asins) {
    window.__saleState = "running";
    for (const asin of asins) {
      if (window.__saleState !== "running") break;
      if (window.__saleResults.some((r) => r.asin === asin)) continue;
      let o;
      try {
        // credentials: "omit" = ログイン情報を送らない（ログイン中のChromeで動かしても、未ログインの価格を読み、Amazonの閲覧履歴に残さない）
        const r = await fetch("/dp/" + asin + "?th=1&psc=1", { credentials: "omit" });
        o = parse(await r.text()); o.status = r.status;
      } catch (e) { o = { error: String(e) }; }
      o.asin = asin;
      window.__saleResults.push(o);
      if (o.captcha || o.status === 503 || o.status === 429) { window.__saleState = "stopped:" + asin; return; }
      await sleep(2500 + Math.random() * 1000);
    }
    if (window.__saleState === "running") window.__saleState = "done";
  };
  // 結果を小さくして返す（from〜to件目）。50件ずつ取り出して /tmp/sunalog/sale-chunkN.json に書き、tools/sale_raw.py merge でまとめる
  // バッジあり: [asin, 価格, 比較の価格, 比較の種類, 値引き率, バッジ, 在庫, 同じ商品か(1 か 移った先のASIN), 画像] ／ バッジなし: [asin, 0 か "NT"(商品名が読めない), 値引き率, 在庫]
  window.__saleCompact = (from, to) => JSON.stringify(window.__saleResults.slice(from, to).map((r) => r.badge
    ? [r.asin, r.price, r.basis, (r.basisLabel || "").slice(0, 4), r.pct, r.badge, (r.avail || "").slice(0, 12), r.asinSel === r.asin ? 1 : r.asinSel, (r.image || "").replace("https://m.media-amazon.com/images/I/", "")]
    : [r.asin, r.title ? 0 : "NT", r.pct || 0, (r.avail || "").slice(0, 8)]));
})();
