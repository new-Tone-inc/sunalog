/* セール調査用（ブラウザで動かす）。Amazonの商品ページを1件ずつ読み、価格とセール表示を集める。
 *
 * 使い方（手順は README「セールの特設ページ」）:
 *   1. ブラウザで https://www.amazon.co.jp/blackfriday など amazon.co.jp のページを開く（ログインは不要）
 *   2. このファイルの中身をそのページで実行し、続けて  window.__saleCheck([ASINの配列])  を呼ぶ
 *   3. window.__saleState が "done" になったら、window.__saleResults を data/sale-raw.json に保存する
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
        const r = await fetch("/dp/" + asin + "?th=1&psc=1", { credentials: "include" });
        o = parse(await r.text()); o.status = r.status;
      } catch (e) { o = { error: String(e) }; }
      o.asin = asin;
      window.__saleResults.push(o);
      if (o.captcha || o.status === 503 || o.status === 429) { window.__saleState = "stopped:" + asin; return; }
      await sleep(2500 + Math.random() * 1000);
    }
    if (window.__saleState === "running") window.__saleState = "done";
  };
})();
