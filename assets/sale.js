/* セールの特設ページ（blackfriday/ など）— データは data/sale.json（tools/sale_build.py が作る） */
(function () {
  "use strict";

  const CATEGORY_ORDER = ["カメラ・映像", "スマホ・タブレット", "オーディオ", "PC・周辺機器", "ウェアラブル", "家電", "カバンの中身", "バッグ・小物", "日常・Vlog", "その他"];
  const SORTS = [
    { value: "off", label: "割引率が高い順" },
    { value: "price", label: "価格が安い順" },
    { value: "new", label: "最近紹介した順" },
  ];
  const state = { category: "all", sort: "off" };
  let SALE = null;

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const yen = (n) => `${Number(n).toLocaleString("ja-JP")}円`;
  const md = (d) => { const [, m, day] = d.split("-"); return `${Number(m)}/${Number(day)}`; };
  const fmtDate = (d) => d.split("-").join(".");

  function track(name, params) {
    if (typeof window.gtag !== "function") return;
    try { window.gtag("event", name, params || {}); } catch (_) {}
  }

  // ---- 共有（スマホは共有シート、それ以外はリンクをコピー）。共有URLには utm_source=share を付け、共有リンクから来た人を区別する ----
  const SHARE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>`;
  function shareUrl() {
    const base = ((window.SUNALOG_CONFIG || {}).siteUrl || location.origin).replace(/\/$/, "");
    const dir = location.pathname.replace(/index\.html$/, "").replace(/^\/?/, "/").replace(/\/?$/, "/");
    return `${base}${dir}?utm_source=share&utm_medium=referral&utm_campaign=sale`;
  }
  let toastTimer = 0;
  function toast(msg) {
    let el = $("#toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-show"), 2200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (_) { return false; }
  }
  async function sharePage() {
    const url = shareUrl();
    const title = `${SALE.title} セール対象まとめ`;
    const ev = { post_id: `sale:${SALE.id || ""}`, post_title: title };
    const data = { title: `${title} | すなおのガジェログ`, text: `${title}（すなおのガジェログ）`, url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try { await navigator.share(data); track("share", Object.assign({ method: "native" }, ev)); return; }
      catch (e) { if (e && e.name === "AbortError") return; } // キャンセルは何もしない。それ以外はコピーへ
    }
    const ok = await copyText(url);
    toast(ok ? "リンクをコピーしました" : url);
    track("share", Object.assign({ method: ok ? "copy" : "copy_failed" }, ev));
  }

  // セールの最終日（日本時間）の終わりを過ぎたら「終了」
  function isEnded(sale) {
    const end = sale.until ? Date.parse(`${sale.until}T23:59:59+09:00`) : NaN;
    return !(Date.now() <= end);
  }
  function currentPeriod(sale) {
    const now = Date.now();
    return (sale.periods || []).find((p) => now >= Date.parse(`${p.from}T00:00:00+09:00`) && now <= Date.parse(`${p.to}T23:59:59+09:00`)) || null;
  }
  // Amazonのバッジの文言から「ブラックフライデー」を除いた短い表記にする（先行セール／厳選目玉商品 など）
  function badgeLabel(b) {
    if (/プライム/.test(b || "")) return "プライム会員限定"; // 「…プライムセール」は、商品ページに「このセールはAmazonプライム会員限定です」と出る価格
    const s = String(b || "").replace(/^ブラックフライデー\s*/, "").trim();
    return s || "セール";
  }
  function newestDate(it) {
    return (it.posts || []).map((p) => p.postedDate || "").sort().pop() || "";
  }

  function renderChips(el, options, current, onPick, withAll) {
    el.innerHTML = "";
    const list = withAll ? [{ value: "all", label: "すべて" }, ...options] : options;
    list.forEach((o) => {
      const b = document.createElement("button");
      b.className = "chip" + (current === o.value ? " is-active" : "");
      b.textContent = o.label;
      b.onclick = () => onPick(o.value);
      el.appendChild(b);
    });
  }

  function cardHtml(it) {
    const post = (it.posts || [])[0] || {};
    const attrs = `target="_blank" rel="noopener sponsored" data-track="affiliate" data-shop="amazon" data-item="${esc(it.name)}" data-brand="${esc(it.brand || "")}" data-post="${esc(post.id || "")}" data-post-title="${esc(post.title || "")}"`;
    return `
      <article class="sale-card">
        <a class="sale-thumb" href="${esc(it.link)}" ${attrs} aria-label="${esc(it.name)} をAmazonで見る">
          ${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('is-broken')">` : `<span>${esc((it.brand || it.name || "?").trim().charAt(0).toUpperCase())}</span>`}
          ${it.off ? `<span class="sale-off">${esc(it.off)}%OFF</span>` : ""}
        </a>
        <div class="sale-body">
          <div class="sale-tags"><span class="sale-badge">${esc(badgeLabel(it.badge))}</span>${it.pr ? `<span class="featured-pr">PR</span>` : ""}</div>
          ${it.brand && !it.name.toLowerCase().startsWith(it.brand.toLowerCase()) ? `<div class="item-brand">${esc(it.brand)}</div>` : ""}
          <h2 class="item-name">${esc(it.name)}</h2>
          <div class="sale-price"><strong>${yen(it.salePrice)}</strong>${it.basePrice ? `<span class="sale-base"><s>${yen(it.basePrice)}</s>${it.baseLabel ? `（${esc(it.baseLabel)}）` : ""}</span>` : ""}</div>
          ${it.note ? `<div class="item-note">${esc(it.note)}</div>` : ""}
          <div class="item-links"><a class="btn btn-primary" href="${esc(it.link)}" ${attrs}>Amazonで見る<span class="ext">↗</span></a></div>
          ${(it.posts || []).length ? `<div class="item-from">紹介した動画: ${it.posts.slice(0, 2).map((p) => `<a href="../#${encodeURIComponent(p.id)}">${esc(p.title)}</a>`).join(" / ")}${it.posts.length > 2 ? ` ほか${it.posts.length - 2}本` : ""}</div>` : ""}
        </div>
      </article>`;
  }

  function render() {
    const all = SALE.items || [];
    const cats = CATEGORY_ORDER.filter((c) => all.some((it) => it.category === c));
    $("#sale-filters").hidden = all.length < 2;
    renderChips($("#sale-chips-category"), cats.map((c) => ({ value: c, label: `${c}（${all.filter((it) => it.category === c).length}）` })), state.category, (v) => { state.category = v; render(); }, true);
    $("#sale-chips-category").closest(".filter-row").hidden = cats.length < 2;
    renderChips($("#sale-chips-sort"), SORTS, state.sort, (v) => { state.sort = v; track("sale_sort", { sort: v }); render(); }, false);

    const list = all.filter((it) => state.category === "all" || it.category === state.category);
    const by = {
      off: (a, b) => (b.off || 0) - (a.off || 0) || a.salePrice - b.salePrice,
      price: (a, b) => a.salePrice - b.salePrice,
      new: (a, b) => newestDate(b).localeCompare(newestDate(a)) || (b.off || 0) - (a.off || 0),
    }[state.sort];
    list.sort(by);
    $("#sale-count").textContent = `セール対象 ${list.length} 点${state.category !== "all" ? `（${state.category}）` : ""}`;
    $("#sale-grid").innerHTML = list.map(cardHtml).join("");
  }

  function init(sale) {
    SALE = sale;
    document.title = `${sale.title} セール対象まとめ | すなおのガジェログ`;
    $("#sale-title").textContent = sale.title;
    if (sale.lead) $("#sale-lead").textContent = sale.lead;
    if (window.SUNALOG_NOTRACK) { const n = $("#notrack-note"); if (n) n.hidden = false; }

    if (isEnded(sale)) {
      $("#sale-kicker").textContent = "終了しました";
      $("#sale-ended").hidden = false;
      $("#sale-count").hidden = true;
      return;
    }
    const cur = currentPeriod(sale);
    $("#sale-kicker").textContent = cur ? `${cur.label} 開催中` : "開催中";
    const facts = [];
    if ((sale.periods || []).length) facts.push(`期間: ${sale.periods.map((p) => `${p.label} ${md(p.from)}〜${md(p.to)}`).join(" ／ ")}`);
    else if (sale.start && sale.until) facts.push(`期間: ${md(sale.start)}〜${md(sale.until)}`);
    if (sale.checkedAt) facts.push(`価格とセール表示は ${fmtDate(sale.checkedAt)} に確認した時点のものです。セールは予告なく終わることがあります。最新の価格はAmazonでご確認ください。`);
    facts.push("このページのリンクには、アフィリエイトリンク（Amazonアソシエイトなど）が含まれます。");
    $("#sale-facts").innerHTML = facts.map((f) => `<li>${esc(f)}</li>`).join("");
    const shareBtn = `<button class="btn btn-share" type="button" data-sale-share aria-label="このページを共有">${SHARE_ICON}共有</button>`;
    $("#sale-hero-actions").innerHTML = shareBtn;
    document.querySelectorAll("[data-sale-share][hidden]").forEach((b) => { b.hidden = false; });
    if (sale.venue && sale.venue.url) {
      $("#sale-hero-actions").innerHTML = `<a class="btn" href="${esc(sale.venue.url)}" target="_blank" rel="noopener sponsored" data-track="affiliate" data-shop="amazon" data-item="${esc(sale.venue.label || "")}" data-brand="" data-post="" data-post-title="">${esc(sale.venue.label || "セール会場を見る")}<span class="ext">↗</span></a>${shareBtn}`;
    }
    if (sale.footnote) $("#sale-foot").textContent = sale.footnote;
    render();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-sale-share]")) { if (SALE) sharePage(); return; }
    const tr = e.target.closest("a[data-track]");
    if (!tr) return;
    track("affiliate_click", {
      shop: tr.getAttribute("data-shop") || "",
      item_name: tr.getAttribute("data-item") || "",
      item_brand: tr.getAttribute("data-brand") || "",
      post_id: tr.getAttribute("data-post") || "",
      post_title: tr.getAttribute("data-post-title") || "",
      view: "sale",
      link_url: tr.getAttribute("href") || "",
    });
  });

  fetch("../data/sale.json", { cache: "no-store" })
    .then((r) => r.json())
    .then(init)
    .catch(() => { $("#sale-count").textContent = "データを読み込めませんでした（data/sale.json を確認してください）"; });
})();
