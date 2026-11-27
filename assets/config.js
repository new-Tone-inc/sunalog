/* サイトの設定。計測IDなど、データ（videos.json）とは別に置くもの */
window.SUNALOG_CONFIG = {
  // 公開URL（共有リンクの先頭に使う。ローカルやプレビューで開いても共有リンクは本番を指す）
  siteUrl: "https://sunalog.newtone-inc.jp",
  // Google Analytics 4 の測定ID（"G-" から始まる文字列）。空のままなら計測しない
  gaId: "G-CW06FTNHQX",
  // 「人気の動画」の対象期間（直近何ヶ月の投稿か）。2026-11-24から3ヶ月で試験運用中（それまでは12）
  popularMonths: 3,
  // セールの案内（トップの一番上に出す帯。特設ページへのリンク）。until の日（日本時間）の終わりまで出し、過ぎると自動で消える。sale を消せば出ない
  // 件数は data/sale.json から自動で入る
  sale: {
    title: "Amazonブラックフライデー開催中",
    text: "紹介したアイテムのセール対象をまとめました",
    url: "blackfriday/",
    until: "2026-12-07",
  },
  // 「今話題の製品」（人気の動画の上に出す枠）。until の日（日本時間）の終わりまで出し、過ぎると自動で消える。空（[]）なら枠ごと出ない
  // id: data/videos.json の投稿ID / note: 見出しの下に出す一言（無くてもよい） / cta: 追加のリンクボタン（無くてもよい）
  featured: [
    {
      id: "ecovacs-winbot-window-cleaning",
      until: "2026-12-09",
      note: "Amazonブラックフライデー 11/27〜12/7",
      cta: { label: "Amazonのセール会場を見る", url: "https://ecovacs.band/69fd51" },
    },
  ],
};
