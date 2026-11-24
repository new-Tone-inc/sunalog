/* サイトの設定。計測IDなど、データ（videos.json）とは別に置くもの */
window.SUNALOG_CONFIG = {
  // 公開URL（共有リンクの先頭に使う。ローカルやプレビューで開いても共有リンクは本番を指す）
  siteUrl: "https://sunalog.newtone-inc.jp",
  // Google Analytics 4 の測定ID（"G-" から始まる文字列）。空のままなら計測しない
  gaId: "G-CW06FTNHQX",
  // 「人気の動画」の対象期間（直近何ヶ月の投稿か）。2026-11-24から3ヶ月で試験運用中（それまでは12）
  popularMonths: 3,
};
