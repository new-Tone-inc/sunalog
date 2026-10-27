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
  const state = { view: "videos", month: "all", category: "all", mall: "all", q: "" };
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
      if (state.month !== "all" && monthKey(v) !== state.month) return false;
      if (state.category !== "all" && v.category !== state.category) return false;
      if (state.mall !== "all" && !videoMalls(v).some((m) => m.key === state.mall)) return false;
      const text = [v.title, v.hook, ...(v.items || []).map((i) => `${i.brand || ""} ${i.name}`)].join(" ");
      return matchesQuery(text);
    });
  }
  function filteredItems() {
    return ITEMS.filter((it) => {
      const v = it.video;
      if (state.month !== "all" && monthKey(v) !== state.month) return false;
      if (state.category !== "all" && v.category !== state.category) return false;
      if (state.mall !== "all" && !itemLinks(it)[state.mall]) return false;
      return matchesQuery(`${it.brand || ""} ${it.name} ${v.title}`);
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
    const months = [...new Set(VIDEOS.map(monthKey).filter(Boolean))].sort().reverse();
    renderChips($("#chips-month"), months.map((m) => ({ value: m, label: monthLabel(m) })), state.month, (v) => { state.month = v; render(); });

    const cats = CATEGORY_ORDER.filter((c) => VIDEOS.some((v) => v.category === c));
    renderChips($("#chips-category"), cats.map((c) => ({ value: c, label: c })), state.category, (v) => { state.category = v; render(); });

    const mallsUsed = MALLS.filter((m) => VIDEOS.some((v) => videoMalls(v).some((x) => x.key === m.key)));
    renderChips($("#chips-mall"), mallsUsed.map((m) => ({ value: m.key, label: m.label })), state.mall, (v) => { state.mall = v; render(); });
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
        <div class="item-from">紹介した動画: <button data-open="${esc(it.video.id)}">${esc(it.video.title)}</button></div>
      </article>`).join("");
  }

  // ---- render: modal ----
  function openModal(id) {
    const v = VIDEOS.find((x) => x.id === id);
    if (!v) return;
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
      </div>`;
    $("#modal").hidden = false;
    document.body.classList.add("modal-open");
    $(".modal-close").focus();
    history.replaceState(null, "", `#${encodeURIComponent(v.id)}`);
  }
  function closeModal() {
    $("#modal").hidden = true;
    document.body.classList.remove("modal-open");
    history.replaceState(null, "", location.pathname + location.search);
  }

  // ---- render all ----
  function render() {
    renderFilters();
    const vids = filteredVideos();
    const items = filteredItems();
    $("#view-videos").hidden = state.view !== "videos";
    $("#view-items").hidden = state.view !== "items";
    if (state.view === "videos") {
      renderVideos(vids);
      $("#result-count").textContent = `${vids.length} 本の動画`;
      $("#empty").hidden = vids.length > 0;
    } else {
      renderItems(items);
      $("#result-count").textContent = `${items.length} 点のアイテム`;
      $("#empty").hidden = items.length > 0;
    }
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
    const open = e.target.closest("[data-open]");
    if (open) { openModal(open.getAttribute("data-open")); return; }
    if (e.target.closest("[data-close]")) closeModal();
    const tab = e.target.closest(".tab");
    if (tab) {
      state.view = tab.dataset.view;
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      render();
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
  $("#search").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });

  // ---- load ----
  function init(data) {
    // 公開するのは投稿済み（status: "posted"）だけ。未投稿はデータに残しておいても表示しない
    VIDEOS = (data || []).filter((v) => !v.status || v.status === "posted").sort((a, b) => (b.postedDate || "").localeCompare(a.postedDate || ""));
    ITEMS = [];
    VIDEOS.forEach((v) => (v.items || []).forEach((it) => ITEMS.push(Object.assign({}, it, { video: v }))));
    $("#count-videos").textContent = VIDEOS.length;
    $("#count-items").textContent = ITEMS.length;
    render();
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash) openModal(hash);
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
