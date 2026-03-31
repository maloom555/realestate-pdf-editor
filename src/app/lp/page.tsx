import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '不動産PDF工房 - 物件資料のPDF編集を、もっとかんたんに。無料・ブラウザ完結',
  description:
    '物件資料のPDF編集がブラウザだけで完結。墨消し・注釈・描画・ページ編集まで直感操作。さらに不動産専用スタンプ・テンプレートも搭載。サーバー送信なし・アカウント不要・完全無料。',
  keywords: [
    'PDF編集', '無料', 'ブラウザ', 'オンライン', '不動産',
    '物件資料', '墨消し', '注釈', 'スタンプ', '方位マーク',
  ],
}

// --- 不動産専用スタンプ ---
const stamps = [
  { label: '対象物件', color: 'from-red-500 to-rose-600' },
  { label: '当該地', color: 'from-red-500 to-rose-600' },
  { label: '最寄駅', color: 'from-blue-500 to-blue-700' },
  { label: '境界確定済', color: 'from-emerald-500 to-emerald-700' },
  { label: '売主物件', color: 'from-violet-500 to-purple-700' },
  { label: '成約済', color: 'from-red-500 to-rose-600' },
  { label: '商談中', color: 'from-amber-500 to-orange-600' },
  { label: '機密文書', color: 'from-red-600 to-red-800' },
  { label: '方位マーク', color: 'from-slate-600 to-slate-800' },
]

// --- テキストテンプレート例 ---
const templates = [
  '※現況優先', '※告知事項あり', '※セットバック要',
  '※再建築不可', '※旧耐震基準', '※表示価格は税込みです',
  '内見予約: TEL 000-0000-0000',
]

// --- 全機能リスト ---
const allFeatures = [
  '墨消し（フラット化で復元不可）', '不動産専用スタンプ 9種', 'テキストテンプレート 29種',
  '署名スタンプ（会社名・ロゴ）', '方位マーク', 'テキスト入力（フォント5種）',
  '矢印・矢印テキスト（コールアウト）', 'ハイライト（透明度調整可）',
  '円・四角・自由線・折線', 'ページ並び替え・回転・削除・複製',
  'PDF結合・ページ抽出', '空白ページ追加', '画像（JPG/PNG/WebP）の取り込み',
  'クリップボード画像の貼り付け', 'PDF圧縮（3段階）', 'ページ番号挿入',
  'プロジェクト自動保存', 'Undo / Redo 無制限',
  '色・線幅・透明度・角丸・破線・回転', 'ズーム（0.5x〜4x）・フィット表示',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        .font-display { font-family: 'Inter', 'Noto Sans JP', sans-serif; }
        .font-body { font-family: 'Noto Sans JP', 'Inter', sans-serif; }
        .hero-grid {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0);
          background-size: 32px 32px;
        }
        .glow { box-shadow: 0 0 60px rgba(99, 102, 241, 0.15), 0 0 120px rgba(99, 102, 241, 0.05); }
        .stamp-hover { transition: all 0.2s; }
        .stamp-hover:hover { transform: translateY(-2px) rotate(-1deg); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
      `}</style>

      {/* ===== Nav ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/lp" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm font-display">工</span>
            </div>
            <span className="text-[15px] font-bold text-white/90 font-display tracking-tight group-hover:text-white transition-colors">不動産工房</span>
          </Link>
          <div className="flex items-center gap-5">
            <a href="#features" className="hidden sm:block text-[13px] text-white/40 hover:text-white/80 transition-colors font-body">機能</a>
            <a href="#realestate" className="hidden sm:block text-[13px] text-white/40 hover:text-white/80 transition-colors font-body">不動産向け</a>
            <a href="#tools" className="hidden sm:block text-[13px] text-white/40 hover:text-white/80 transition-colors font-body">シリーズ</a>
            <Link href="/editor"
              className="px-4 py-2 bg-white text-[#0f0f13] text-[13px] font-bold rounded-lg hover:bg-white/90 transition-colors font-display">
              無料で使う
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero（ダーク） ===== */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 bg-[#0f0f13] overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        {/* 装飾オーブ */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-violet-600/15 rounded-full blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            <span className="text-[12px] text-white/50 font-body tracking-wide">無料・ブラウザ完結・登録不要</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-[1.15] tracking-tight">
            不動産業務のPDF編集を、
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">もっとかんたんに。</span>
          </h1>

          <p className="font-body text-[15px] md:text-[17px] text-white/45 mb-10 max-w-xl mx-auto leading-relaxed">
            墨消し・注釈・描画・ページ編集まで、直感操作でサクサク。
            <br className="hidden md:inline" />
            さらに不動産専用スタンプ・テンプレートも搭載。
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-12">
            <Link href="/editor"
              className="font-display px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-base rounded-xl shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all">
              今すぐ無料で使う
            </Link>
            <a href="#features"
              className="font-display px-8 py-4 bg-white/[0.06] text-white/70 font-semibold text-base rounded-xl border border-white/[0.08] hover:bg-white/[0.1] hover:text-white transition-all">
              機能を見る
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[12px] text-white/30 font-body">
            {['サーバー送信なし', 'アカウント不要', 'インストール不要', '完全無料'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-emerald-400/60" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 8 7 12 13 4" /></svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== できること ===== */}
      <section id="features" className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="font-display text-[11px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-3 block">Features</span>
            <h2 className="font-display text-2xl md:text-4xl font-extrabold text-[#1a1a2e] mb-4 tracking-tight">PDFを開いて、すぐ編集。</h2>
            <p className="font-body text-sm text-gray-400 max-w-md mx-auto">直感的な操作で、必要な編集がすぐに完了します</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* カード1: 描画 */}
            <div className="group relative bg-gradient-to-br from-[#f8f7ff] to-white rounded-2xl p-7 border border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></svg>
              </div>
              <h3 className="font-display font-bold text-[#1a1a2e] mb-2 text-[15px]">直感的に書き込み・描画</h3>
              <p className="font-body text-[13px] text-gray-400 leading-relaxed">矢印、ハイライト、円、四角、自由線など11種の描画ツール。手書き感覚でPDFに直接書き込めます。</p>
            </div>

            {/* カード2: PDF結合 */}
            <div className="group relative bg-gradient-to-br from-[#f7faff] to-white rounded-2xl p-7 border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M8 6H4a2 2 0 00-2 2v8a2 2 0 002 2h4" /><path d="M16 6h4a2 2 0 012 2v8a2 2 0 01-2 2h-4" /><path d="M12 2v20" /></svg>
              </div>
              <h3 className="font-display font-bold text-[#1a1a2e] mb-2 text-[15px]">複数資料を1つのPDFに</h3>
              <p className="font-body text-[13px] text-gray-400 leading-relaxed">PDF・写真をドラッグ&ドロップ。物件概要書+間取り図+写真を1ファイルにまとめられます。</p>
            </div>

            {/* カード3: ページ編集 */}
            <div className="group relative bg-gradient-to-br from-[#f7fff9] to-white rounded-2xl p-7 border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="8" y="2" width="12" height="16" rx="2" /><path d="M4 6v14a2 2 0 002 2h10" /></svg>
              </div>
              <h3 className="font-display font-bold text-[#1a1a2e] mb-2 text-[15px]">ページ編集も自由自在</h3>
              <p className="font-body text-[13px] text-gray-400 leading-relaxed">並び替え・回転・削除・複製・抽出がドラッグ操作で完結。空白ページの追加やページ番号挿入も。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 不動産向け特化機能 ===== */}
      <section id="realestate" className="py-20 md:py-28 bg-[#0f0f13] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="font-display text-[11px] font-bold text-violet-400 uppercase tracking-[0.2em] mb-3 block">For Real Estate</span>
            <h2 className="font-display text-2xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">さらに、不動産業務向けの機能も。</h2>
            <p className="font-body text-sm text-white/35">一般のPDF編集ツールにはない、業界専用のスタンプ・テンプレートを搭載</p>
          </div>

          {/* スタンプ */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-8 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white"><rect x="4" y="16" width="16" height="4" rx="1" /><path d="M8 16V12a4 4 0 018 0v4" /></svg>
              </div>
              <h3 className="font-display font-bold text-white text-[15px]">不動産専用スタンプ 9種 + 方位マーク</h3>
            </div>
            <p className="font-body text-[13px] text-white/30 mb-6 ml-11">クリックするだけで配置。引出線付きで対象箇所を指し示すことも可能。</p>
            <div className="flex flex-wrap gap-2.5 ml-11">
              {stamps.map((s, i) => (
                <span key={s.label}
                  className={`stamp-hover bg-gradient-to-r ${s.color} text-white text-[13px] font-bold px-4 py-2 rounded-lg shadow-lg cursor-default`}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* テンプレート */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /></svg>
              </div>
              <h3 className="font-display font-bold text-white text-[15px]">テキストテンプレート 29種</h3>
            </div>
            <p className="font-body text-[13px] text-white/30 mb-6 ml-11">よく使う不動産の定型文をワンクリックで挿入。入力ミスや表記揺れを防止。</p>
            <div className="flex flex-wrap gap-2 ml-11">
              {templates.map((t) => (
                <span key={t}
                  className="text-[12px] bg-amber-500/10 text-amber-300/80 border border-amber-500/20 px-3 py-1.5 rounded-lg font-body">
                  {t}
                </span>
              ))}
              <span className="text-[12px] bg-white/5 text-white/20 border border-white/10 px-3 py-1.5 rounded-lg font-body">
                ...他 22種
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 全機能一覧 ===== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="font-display text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 block">All Features</span>
            <h2 className="font-display text-2xl md:text-4xl font-extrabold text-[#1a1a2e] mb-4 tracking-tight">搭載機能一覧</h2>
            <p className="font-body text-sm text-gray-400">11種の描画ツール + ページ編集 + 出力機能</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {allFeatures.map((f) => (
              <div key={f} className="flex items-start gap-2.5 bg-[#fafafa] rounded-xl px-4 py-3 group hover:bg-indigo-50 transition-colors">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 8 7 12 13 4" /></svg>
                <span className="font-body text-[13px] text-gray-600">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 安心ポイント ===== */}
      <section className="py-20 md:py-28 bg-[#fafafa]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="font-display text-[11px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-3 block">Security & Privacy</span>
            <h2 className="font-display text-2xl md:text-4xl font-extrabold text-[#1a1a2e] mb-4 tracking-tight">安心して使える理由</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', sub: 'M9 12l2 2 4-4', gradient: 'from-emerald-500 to-teal-600', title: '完全ローカル処理', desc: 'ファイルはサーバーに一切送信されません。契約書や個人情報を含む資料も安心して編集できます。' },
              { icon: 'M12 2a10 10 0 110 20 10 10 0 010-20z', sub: 'M2 12h20', gradient: 'from-blue-500 to-cyan-600', title: 'ブラウザだけで完結', desc: 'インストール不要。PC・タブレット・スマホ、URLを開くだけですぐ使えます。' },
              { icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', sub: '', gradient: 'from-amber-500 to-orange-600', title: '無料・登録不要', desc: 'アカウント登録もログインも不要。今すぐ使い始められます。' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 border border-gray-100 text-center hover:shadow-lg transition-shadow">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <path d={item.icon} />
                    {item.sub && <path d={item.sub} />}
                  </svg>
                </div>
                <h3 className="font-display font-bold text-[#1a1a2e] mb-2">{item.title}</h3>
                <p className="font-body text-[13px] text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 工房シリーズ ===== */}
      <section id="tools" className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="font-display text-[11px] font-bold text-violet-500 uppercase tracking-[0.2em] mb-3 block">Product Lineup</span>
            <h2 className="font-display text-2xl md:text-4xl font-extrabold text-[#1a1a2e] mb-4 tracking-tight">不動産工房シリーズ</h2>
            <p className="font-body text-sm text-gray-400">不動産業務に特化したツールを順次公開中</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* PDF工房 */}
            <div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-7 border-2 border-indigo-200 glow">
              <div className="absolute -top-3 left-7">
                <span className="font-display text-[11px] px-3.5 py-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-full font-bold shadow-lg shadow-indigo-500/20">公開中</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center mb-4 mt-2 shadow-lg shadow-indigo-500/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
              </div>
              <h3 className="font-display font-bold text-[#1a1a2e] mb-2">不動産PDF工房</h3>
              <p className="font-body text-[12px] text-gray-400 leading-relaxed mb-5">
                不動産専用スタンプ・テンプレート搭載のPDF編集ツール。墨消し・注釈・図形・ページ編集まで。
              </p>
              <Link href="/editor"
                className="font-display block w-full text-center px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all">
                使ってみる
              </Link>
            </div>

            {/* マスキング */}
            <div className="relative bg-white rounded-2xl p-7 border border-gray-100">
              <div className="absolute -top-3 left-7">
                <span className="font-display text-[11px] px-3.5 py-1 bg-gray-100 text-gray-400 rounded-full font-bold">準備中</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4 mt-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M12 2a4 4 0 014 4v2H8V6a4 4 0 014-4z" /><rect x="3" y="8" width="18" height="14" rx="2" /><circle cx="9" cy="15" r="1.5" fill="currentColor" /><circle cx="15" cy="15" r="1.5" fill="currentColor" /></svg>
              </div>
              <h3 className="font-display font-bold text-gray-400 mb-2">不動産マスキング工房</h3>
              <p className="font-body text-[12px] text-gray-300 leading-relaxed mb-5">
                AI（ChatGPT・Claude）にPDFを送る前に個人情報を素早くマスキング。スマホ対応。
              </p>
              <span className="block w-full text-center px-4 py-3 bg-gray-50 text-gray-300 text-[13px] rounded-xl cursor-not-allowed font-display">Coming Soon</span>
            </div>

            {/* 写真 */}
            <div className="relative bg-white rounded-2xl p-7 border border-gray-100">
              <div className="absolute -top-3 left-7">
                <span className="font-display text-[11px] px-3.5 py-1 bg-gray-100 text-gray-400 rounded-full font-bold">準備中</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4 mt-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
              </div>
              <h3 className="font-display font-bold text-gray-400 mb-2">不動産写真工房</h3>
              <p className="font-body text-[12px] text-gray-300 leading-relaxed mb-5">
                物件写真の一括リサイズ・圧縮・透かし・明るさ補正。ポータルサイト投稿前の下準備を効率化。
              </p>
              <span className="block w-full text-center px-4 py-3 bg-gray-50 text-gray-300 text-[13px] rounded-xl cursor-not-allowed font-display">Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative py-24 md:py-32 bg-[#0f0f13] overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[150px]" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-2xl md:text-4xl font-extrabold text-white mb-5 tracking-tight">
            物件資料のPDF編集、もっと簡単に。
          </h2>
          <p className="font-body text-[14px] text-white/35 mb-10 max-w-md mx-auto leading-relaxed">
            使いやすいPDF編集に、不動産向けの便利機能をプラス。
            <br />
            無料・登録不要・サーバー送信なし。
          </p>
          <Link href="/editor"
            className="font-display inline-block px-10 py-4 bg-white text-[#1a1a2e] font-bold text-base rounded-xl shadow-2xl hover:shadow-white/10 hover:scale-[1.02] transition-all">
            PDF編集を始める
          </Link>
        </div>
      </section>

      {/* ===== 開発依頼 ===== */}
      <section className="py-14 bg-[#0a0a0e] border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-base font-bold text-white/60 mb-2">このようなツール・アプリ開発を承ります</h2>
          <p className="font-body text-[13px] text-white/25 mb-5">
            業務効率化ツール・Webアプリ・社内システムなど、お気軽にご相談ください。
          </p>
          <a href="https://x.com/" target="_blank" rel="noopener noreferrer"
            className="font-display inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg text-[13px] font-semibold text-white/50 hover:text-white/80 transition-all border border-white/[0.06]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            X (Twitter) で相談する
          </a>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-[#0a0a0e] py-8 border-t border-white/[0.03]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-[10px] font-display">工</span>
              </div>
              <span className="font-display font-bold text-white/30 text-[13px]">不動産工房</span>
            </div>
            <div className="flex items-center gap-5 text-[12px] font-body">
              <a href="https://x.com/" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/60 transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <Link href="/editor" className="text-white/20 hover:text-white/60 transition-colors">エディター</Link>
              <Link href="/privacy" className="text-white/20 hover:text-white/60 transition-colors">プライバシー</Link>
              <Link href="/terms" className="text-white/20 hover:text-white/60 transition-colors">利用規約</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
