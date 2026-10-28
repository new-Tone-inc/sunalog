/* すなおのガジェログ — データは data/videos.json */
(function () {
  "use strict";

  const MALLS = [
    { key: "amazon", label: "Amazon", cls: "btn-amazon" },
    { key: "rakuten", label: "楽天", cls: "btn-rakuten" },
    { key: "yahoo", label: "Yahoo", cls: "btn-yahoo" },
    { key: "official", label: "公式サイト", cls: "" },
  ];
  const CATEGORY_ORDER = ["カメラ・映像", "スマホ・タブレット", "オーディオ", "PC・周辺機器", "ウェアラブル", "家電", "カバンの中身", "バッグ・小物", "日常・Vlog", "その他"];

  // claude.ai のプレビュー上は外部サイトの埋め込みがCSPで止められるため、再生ボタンを出さない（自分のドメインに置けば動く）
  const EMBED_OK = !/(^|\.)claude\.ai$/.test(location.hostname);
  const state = { view: "videos", year: "all", month: "all", category: "all", mall: "all", q: "", page: 1 };
  const PAGE_SIZE = 10;
  let VIDEOS = [];
  let ITEMS = [];

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- data helpers ----
  function itemLinks(item) {
    const l = Object.assign({}, item.links || {});
    if (!l.official && item.officialUrl) l.official = item.officialUrl;
    return l;
  }
  function videoMalls(v) {
    const set = new Set();
    (v.items || []).forEach((it) => Object.entries(itemLinks(it)).forEach(([k, u]) => { if (u) set.add(k); }));
    return MALLS.filter((m) => set.has(m.key));
  }
  function monthKey(v) {
    if (!v.postedDate) return null;
    const [y, m] = v.postedDate.split("-");
    return `${y}-${m}`;
  }
  function monthLabel(key) {
    const [y, m] = key.split("-");
    return `${y.slice(2)}年${Number(m)}月`;
  }
  function fmtDate(d) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${y}.${m}.${day}`;
  }
  function isNew(v) {
    if (!v.postedDate) return false;
    return (Date.now() - new Date(v.postedDate).getTime()) < 1000 * 60 * 60 * 24 * 14;
  }
  function matchesQuery(text) {
    if (!state.q) return true;
    return text.toLowerCase().includes(state.q.toLowerCase());
  }

  function filteredVideos() {
    return VIDEOS.filter((v) => {
      if (state.year !== "all" && !(v.postedDate || "").startsWith(state.year)) return false;
      if (state.month !== "all" && monthKey(v) !== state.month) return false;
      if (state.category !== "all" && v.category !== state.category) return false;
      if (state.mall !== "all" && !videoMalls(v).some((m) => m.key === state.mall)) return false;
      const text = [v.title, v.hook, ...(v.items || []).map((i) => `${i.brand || ""} ${i.name}`)].join(" ");
      return matchesQuery(text);
    });
  }
  // 同じアイテムは一つにまとめ、紹介した動画を複数ぶら下げる。
  // まとめる単位は item.key（データで明示）か、無ければ「ブランド+名前」の表記ゆれを除いた文字列
  function itemKey(it) {
    if (it.key) return it.key;
    const n = (t) => (t || "").toLowerCase().replace(/[\s（）()・,、/／\-‐－]/g, "");
    return `${n(it.brand)}|${n(it.name)}`;
  }
  function buildItems() {
    const map = new Map();
    VIDEOS.forEach((v) => (v.items || []).forEach((it) => { // VIDEOSは新しい順
      const k = itemKey(it);
      if (!map.has(k)) { map.set(k, Object.assign({}, it, { links: Object.assign({}, itemLinks(it)), video: v, videos: [v] })); return; }
      const g = map.get(k);
      g.videos.push(v);
      // 新しい動画の情報を優先しつつ、空いている項目は古い動画から補う
      ["price", "note", "image", "imageSource", "officialUrl", "brand"].forEach((f) => { if (!g[f] && it[f]) g[f] = it[f]; });
      Object.entries(itemLinks(it)).forEach(([m, u]) => { if (u && !g.links[m]) g.links[m] = u; });
    }));
    return [...map.values()];
  }
  function filteredItems() {
    return ITEMS.filter((it) => {
      const vs = it.videos || [it.video];
      if (state.year !== "all" && !vs.some((v) => (v.postedDate || "").startsWith(state.year))) return false;
      if (state.month !== "all" && !vs.some((v) => monthKey(v) === state.month)) return false;
      if (state.category !== "all" && !vs.some((v) => v.category === state.category)) return false;
      if (state.mall !== "all" && !itemLinks(it)[state.mall]) return false;
      return matchesQuery(`${it.brand || ""} ${it.name} ${vs.map((v) => v.title).join(" ")}`);
    });
  }

  // ---- render: chips ----
  function renderChips(el, options, current, onPick) {
    el.innerHTML = "";
    const all = document.createElement("button");
    all.className = "chip" + (current === "all" ? " is-active" : "");
    all.textContent = "すべて";
    all.onclick = () => onPick("all");
    el.appendChild(all);
    options.forEach((o) => {
      const b = document.createElement("button");
      b.className = "chip" + (current === o.value ? " is-active" : "");
      b.textContent = o.label;
      b.onclick = () => onPick(o.value);
      el.appendChild(b);
    });
  }
  function renderFilters() {
    // 紹介した年 → 年を選ぶと、その年の月が下に出る
    const years = [...new Set(VIDEOS.map((v) => (v.postedDate || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    renderChips($("#chips-year"), years.map((y) => ({ value: y, label: `${y}年` })), state.year, (v) => { state.year = v; state.month = "all"; state.page = 1; render(); });
    const monthBox = $("#chips-month");
    monthBox.hidden = state.year === "all";
    if (state.year !== "all") {
      const months = [...new Set(VIDEOS.map(monthKey).filter((m) => m && m.startsWith(state.year)))].sort().reverse();
      renderChips(monthBox, months.map((m) => ({ value: m, label: `${Number(m.split("-")[1])}月` })), state.month, (v) => { state.month = v; state.page = 1; render(); });
    }

    const cats = CATEGORY_ORDER.filter((c) => VIDEOS.some((v) => v.category === c));
    renderChips($("#chips-category"), cats.map((c) => ({ value: c, label: c })), state.category, (v) => { state.category = v; state.page = 1; render(); });

    const mallsUsed = MALLS.filter((m) => VIDEOS.some((v) => videoMalls(v).some((x) => x.key === m.key)));
    renderChips($("#chips-mall"), mallsUsed.map((m) => ({ value: m.key, label: m.label })), state.mall, (v) => { state.mall = v; state.page = 1; render(); });
    $("#chips-mall").closest(".filter-row").hidden = mallsUsed.length === 0;
  }

  // ---- render: item thumbnail（画像はAmazon・楽天・公式サイトの商品画像をそのまま参照。無ければブランドの頭文字） ----
  function thumbHtml(it, v) {
    if (it.image) return `<div class="item-thumb"><img src="${esc(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('is-broken')"></div>`;
    // 商品画像が無いときは、紹介した動画のサムネイル（投稿のカバー）を代わりに出す
    if (v && v.cover) return `<div class="item-thumb item-thumb-cover"><img src="assets/covers/${esc(v.cover)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('is-broken')"><span class="thumb-tag">動画</span></div>`;
    const ch = (it.brand || it.name || "?").trim().charAt(0).toUpperCase();
    return `<div class="item-thumb item-thumb-empty"><span>${esc(ch)}</span></div>`;
  }

  // ---- render: link buttons ----
  function linkButtons(item, small) {
    const links = itemLinks(item);
    return MALLS.filter((m) => links[m.key]).map((m) =>
      `<a class="btn ${small ? "btn-sm" : ""} ${m.cls}" href="${esc(links[m.key])}" target="_blank" rel="noopener sponsored">${m.label}<span class="ext">↗</span></a>`
    ).join("");
  }

  // ---- render: video grid ----
  function coverHtml(v, cls) {
    if (v.cover) return `<img src="assets/covers/${esc(v.cover)}" alt="${esc(v.title)}" loading="lazy">`;
    return `<div class="no-cover">${esc(v.title)}</div>`;
  }
  function renderVideos(list) {
    const el = $("#view-videos");
    el.innerHTML = list.map((v) => `
      <article class="card">
        <button class="card-cover" data-open="${esc(v.id)}" aria-label="${esc(v.title)} の詳細">
          ${coverHtml(v)}
          <span class="badge-cat">${esc(v.category || "")}</span>
          ${v.postedDate ? `<span class="badge-date">${esc(fmtDate(v.postedDate))}</span>` : ""}
          ${isNew(v) ? `<span class="badge-new">NEW</span>` : ""}
          ${v.pr ? `<span class="badge-pr">PR</span>` : ""}
        </button>
        <h2 class="card-title">${esc(v.title)}</h2>
        <p class="card-meta">${(v.items || []).length ? `アイテム ${v.items.length}点` : "アイテムなし"}</p>
        <div class="card-malls">${videoMalls(v).map((m) => `<span class="btn btn-sm ${m.cls}">${m.label}</span>`).join("")}</div>
      </article>`).join("");
  }

  // ---- render: item grid ----
  function renderItems(list) {
    const el = $("#view-items");
    el.innerHTML = list.map((it) => `
      <article class="item-card">
        <div class="item-row">
          ${thumbHtml(it, it.video)}
          <div class="item-body">
            ${it.brand ? `<div class="item-brand">${esc(it.brand)}</div>` : ""}
            <h2 class="item-name">${esc(it.name)}</h2>
            ${it.price ? `<div class="item-price">${esc(it.price)}</div>` : ""}
            ${it.note ? `<div class="item-note">${esc(it.note)}</div>` : ""}
            <div class="item-links">${linkButtons(it, true)}</div>
          </div>
        </div>
        <div class="item-from">紹介した動画${(it.videos || []).length > 1 ? `（${it.videos.length}本）` : ""}: ${(it.videos || [it.video]).map((v) => `<button data-open="${esc(v.id)}">${esc(v.title)}</button>`).join("")}</div>
      </article>`).join("");
  }

  // ---- render: modal ----
  // 関連動画: 「同じブランド」と「同じカテゴリ」で選ぶ（両方当てはまるものを先に、同点なら投稿日が近い順）
  function relatedVideos(v, n = 6) {
    const norm = (t) => (t || "").toLowerCase().replace(/[\s（）()・,、]/g, "");
    const brands = new Set((v.items || []).map((it) => norm(it.brand)).filter(Boolean));
    const t0 = v.postedDate ? Date.parse(v.postedDate) : 0;
    return VIDEOS.filter((x) => x.id !== v.id).map((x) => {
      let score = 0;
      if ((x.items || []).some((it) => brands.has(norm(it.brand)))) score += 2;
      if (x.category && x.category === v.category) score += 1;
      if (score && t0 && x.postedDate) score -= Math.abs(Date.parse(x.postedDate) - t0) / 864e5 / 10000;
      return { x, score };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, n).map((r) => r.x);
  }

  // 戻る操作: モーダルを開くたびに履歴を1つ積み、ブラウザ/スマホの「戻る」で閉じられるようにする
  function openModal(id, fromHistory) {
    const v = VIDEOS.find((x) => x.id === id);
    if (!v) return;
    if (!fromHistory) {
      const depth = (history.state && history.state.depth) || 0;
      history.pushState({ modal: v.id, depth: depth + 1 }, "", `#${encodeURIComponent(v.id)}`);
    }
    const body = $("#modal-body");
    body.innerHTML = `
      <div class="modal-cover" id="modal-cover">
        ${coverHtml(v)}
        ${v.instagramUrl && EMBED_OK ? `<button class="play-btn" data-embed="${esc(v.instagramUrl)}" aria-label="Instagramの動画をここで再生"><span class="play-icon">▶</span><span>動画を再生</span></button>` : ""}
      </div>
      <div class="modal-main">
        <div class="modal-kicker">
          <span>${esc(v.category || "")}</span>
          ${v.postedDate ? `<span>${esc(fmtDate(v.postedDate))} 投稿</span>` : ""}
          ${v.pr ? `<span class="pr-label">PR・提供品を含む投稿</span>` : ""}
        </div>
        <h2 id="modal-title">${esc(v.title)}</h2>
        ${v.hook ? `<p class="modal-hook">${esc(v.hook)}</p>` : ""}
        <div class="modal-actions">
          ${v.instagramUrl ? `<a class="btn btn-primary" href="${esc(v.instagramUrl)}" target="_blank" rel="noopener">Instagramで動画を見る<span class="ext">↗</span></a>` : ""}
          ${v.youtubeUrl ? `<a class="btn btn-dark" href="${esc(v.youtubeUrl)}" target="_blank" rel="noopener">YouTube Shorts<span class="ext">↗</span></a>` : ""}
        </div>
        <div class="modal-section">
          <h3>紹介したアイテム${(v.items || []).length ? `（${v.items.length}点）` : ""}</h3>
          ${(v.items || []).length ? `<ul class="modal-items">${v.items.map((it) => `
            <li class="modal-item">
              ${thumbHtml(it, v)}
              <div class="item-body">
                ${it.brand ? `<div class="item-brand">${esc(it.brand)}</div>` : ""}
                <div class="item-name">${esc(it.name)}</div>
                ${it.price ? `<div class="item-price">${esc(it.price)}</div>` : ""}
                ${it.note ? `<div class="item-note">${esc(it.note)}</div>` : ""}
                <div class="item-links">${linkButtons(it, false)}</div>
              </div>
            </li>`).join("")}</ul>` : `<p class="item-note">この動画はアイテム紹介ではありません。</p>`}
        </div>
        ${v.caption ? `<details class="caption"><summary>投稿のキャプションを見る</summary><pre>${esc(v.caption)}</pre></details>` : ""}
        ${(() => { const rel = relatedVideos(v); return rel.length ? `
        <div class="modal-section modal-related">
          <h3>こちらもどうぞ</h3>
          <div class="related-row">${rel.map((r) => `
            <button class="related-card" data-open="${esc(r.id)}">
              <span class="related-cover">${coverHtml(r)}</span>
              <span class="related-title">${esc(r.title)}</span>
              <span class="related-meta">${esc(r.category || "")}${(r.items || []).length ? ` · ${r.items.length}点` : ""}</span>
            </button>`).join("")}</div>
        </div>` : ""; })()}
        <div class="modal-footer"><button class="btn btn-ghost" data-close>← 一覧に戻る</button></div>
      </div>`;
    $("#modal").hidden = false;
    document.body.classList.add("modal-open");
    $(".modal-panel").scrollTop = 0;
    $(".modal-close").focus({ preventScroll: true });
  }
  function closeModal(fromHistory) {
    if (!fromHistory && history.state && history.state.depth > 0) { history.back(); return; } // popstateで閉じる
    $("#modal").hidden = true;
    document.body.classList.remove("modal-open");
    $("#modal-body").innerHTML = ""; // 埋め込み動画（iframe）を取り除いて再生を止める。hiddenにするだけでは音が鳴り続ける
    if (!fromHistory) history.replaceState(null, "", location.pathname + location.search);
  }
  window.addEventListener("popstate", () => {
    const st = history.state;
    if (st && st.modal) openModal(st.modal, true);
    else if (!$("#modal").hidden) closeModal(true);
  });

  // ---- render: 人気の動画（直近1年・いいね+保存の合計が多い順。stats が入っている動画だけ） ----
  function popularVideos(n = 8) {
    const since = Date.now() - 365 * 864e5;
    return VIDEOS.filter((v) => v.stats && v.postedDate && Date.parse(v.postedDate) >= since)
      .map((v) => ({ v, score: (v.stats.likes || 0) + (v.stats.saves || 0) }))
      .filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, n).map((r) => r.v);
  }
  function renderPopular() {
    const box = $("#popular");
    if (!box) return;
    const list = popularVideos();
    box.hidden = list.length === 0;
    if (!list.length) return;
    $("#popular-row").innerHTML = list.map((v, i) => `
      <button class="related-card" data-open="${esc(v.id)}">
        <span class="related-cover">${coverHtml(v)}<span class="rank">${i + 1}</span></span>
        <span class="related-title">${esc(v.title)}</span>
        <span class="related-meta">${esc(v.category || "")}${v.postedDate ? ` · ${esc(fmtDate(v.postedDate))}` : ""}</span>
      </button>`).join("");
  }

  // ---- render: フォロワー数と目標（data/social.json。followers が入っているものだけ出す） ----
  function renderSocial(list) {
    const box = $("#social");
    const rows = (list || []).filter((p) => typeof p.followers === "number");
    box.hidden = rows.length === 0;
    if (!rows.length) return;
    const fmt = (n) => n.toLocaleString("ja-JP");
    $("#social-grid").innerHTML = rows.map((p) => {
      const hasGoal = typeof p.goal === "number" && p.goal > 0;
      const pct = hasGoal ? Math.min(100, Math.round(p.followers / p.goal * 100)) : 0;
      const left = hasGoal ? Math.max(0, p.goal - p.followers) : 0;
      return `
      <a class="social-card social-${esc(p.platform.toLowerCase())}" href="${esc(p.url || "#")}" target="_blank" rel="noopener">
        <div class="social-head"><span class="social-name">${esc(p.platform)}</span><span class="social-handle">${esc(p.handle || "")}</span></div>
        <div class="social-num"><strong>${fmt(p.followers)}</strong><span class="social-unit">フォロワー</span></div>
        ${hasGoal ? `
        <div class="social-bar"><span style="width:${pct}%"></span></div>
        <div class="social-goal">目標 ${fmt(p.goal)} まで <strong>あと ${fmt(left)}</strong>（${pct}%）</div>` : `<div class="social-goal">目標は設定中</div>`}
        <div class="social-cta">フォローで応援する ↗</div>
      </a>`;
    }).join("");
    const asOf = rows.map((p) => p.asOf).filter(Boolean).sort().pop();
    $("#social-asof").textContent = asOf ? `${fmtDate(asOf)} 時点` : "";
  }

  // ---- render all ----
  function render() {
    renderFilters();
    const vids = filteredVideos();
    const items = filteredItems();
    $("#view-videos").hidden = state.view !== "videos";
    $("#view-items").hidden = state.view !== "items";
    const list = state.view === "videos" ? vids : items;
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), pages);
    const slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    if (state.view === "videos") {
      renderVideos(slice);
      $("#result-count").textContent = `${vids.length} 本の動画${pages > 1 ? `（${state.page} / ${pages} ページ）` : ""}`;
    } else {
      renderItems(slice);
      $("#result-count").textContent = `${items.length} 点のアイテム${pages > 1 ? `（${state.page} / ${pages} ページ）` : ""}`;
    }
    $("#empty").hidden = list.length > 0;
    renderPager(pages);
  }
  // ---- render: ページ送り（10件ずつ。「前へ / 1 2 3 … / 次へ」） ----
  function renderPager(pages) {
    const el = $("#pager");
    el.hidden = pages <= 1;
    if (pages <= 1) { el.innerHTML = ""; return; }
    const cur = state.page;
    const nums = new Set([1, pages, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= pages));
    const parts = [];
    let prev = 0;
    [...nums].sort((a, b) => a - b).forEach((n) => {
      if (n - prev > 1) parts.push(`<span class="pager-gap">…</span>`);
      parts.push(`<button class="pager-btn${n === cur ? " is-active" : ""}" data-page="${n}" ${n === cur ? 'aria-current="page"' : ""}>${n}</button>`);
      prev = n;
    });
    el.innerHTML = `
      <button class="pager-btn pager-nav" data-page="${cur - 1}" ${cur <= 1 ? "disabled" : ""}>← 前へ</button>
      ${parts.join("")}
      <button class="pager-btn pager-nav" data-page="${cur + 1}" ${cur >= pages ? "disabled" : ""}>次へ →</button>`;
  }

  // ---- events ----
  document.addEventListener("click", (e) => {
    const play = e.target.closest("[data-embed]");
    if (play) {
      // Instagramの埋め込み（公開アカウントの投稿のみ再生できる）
      const url = play.getAttribute("data-embed").replace(/\/?$/, "/") + "embed/";
      const box = $("#modal-cover");
      box.classList.add("is-embed");
      box.innerHTML = `<iframe src="${esc(url)}" title="Instagramの動画" allow="autoplay; encrypted-media" allowtransparency="true" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      return;
    }
    const pg = e.target.closest("[data-page]");
    if (pg && !pg.disabled) {
      state.page = Number(pg.dataset.page);
      render();
      $("#result-count").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open) { openModal(open.getAttribute("data-open")); return; }
    if (e.target.closest("[data-close]")) closeModal();
    const tab = e.target.closest(".tab");
    if (tab) {
      state.view = tab.dataset.view;
      state.page = 1;
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      render();
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
  $("#search").addEventListener("input", (e) => { state.q = e.target.value.trim(); state.page = 1; render(); });

  // ---- load ----
  function init(data) {
    // 公開するのは投稿済み（status: "posted"）だけ。未投稿はデータに残しておいても表示しない
    VIDEOS = (data || []).filter((v) => !v.status || v.status === "posted").sort((a, b) => (b.postedDate || "").localeCompare(a.postedDate || ""));
    ITEMS = buildItems();
    $("#count-videos").textContent = VIDEOS.length;
    $("#count-items").textContent = ITEMS.length;
    renderPopular();
    render();
    fetch("data/social.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : []).then(renderSocial).catch(() => {});
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && VIDEOS.some((v) => v.id === hash)) {
      // 共有されたURLで直接開いたとき: 履歴は積まず、閉じるボタンで一覧へ戻る
      history.replaceState({ modal: hash, depth: 0 }, "", `#${encodeURIComponent(hash)}`);
      openModal(hash, true);
    }
  }
  if (window.VIDEOS_DATA) {
    init(window.VIDEOS_DATA);
  } else {
    fetch("data/videos.json", { cache: "no-store" })
      .then((r) => r.json())
      .then(init)
      .catch(() => { $("#result-count").textContent = "データを読み込めませんでした（data/videos.json を確認してください）"; });
  }
})();
