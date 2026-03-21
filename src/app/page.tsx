import Link from 'next/link'

// SVG icon components
const icons = {
  pdf: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  comingSoon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>,
}

// ツール一覧
const tools = [
  {
    id: 'pdf-editor',
    icon: icons.pdf,
    title: 'PDF・写真 編集ツール',
    desc: '墨消し・テキスト注釈・スタンプ・ハイライト・矢印・図形描画など11種のツールで物件資料を編集。フラット化PDF出力対応。',
    href: '/editor',
    status: 'available' as const,
    tags: ['PDF', '写真', '墨消し', 'スタンプ', '注釈'],
  },
  {
    id: 'coming-1',
    icon: icons.comingSoon,
    title: '物件情報管理（予定）',
    desc: '物件情報の一元管理、帯チラシの自動生成、物件写真の整理など。',
    href: '#',
    status: 'coming' as const,
    tags: ['物件管理', '帯チラシ'],
  },
  {
    id: 'coming-2',
    icon: icons.comingSoon,
    title: '書類テンプレート（予定）',
    desc: '重説・契約書・案内図などの定型書類をテンプレートから素早く作成。',
    href: '#',
    status: 'coming' as const,
    tags: ['重説', '契約書', 'テンプレート'],
  },
]

const features = [
  {
    icon: icons.shield,
    title: '完全ローカル処理',
    desc: 'ファイルはサーバーに一切送信されません。すべてブラウザ内で完結するため、機密書類も安心',
  },
  {
    icon: icons.globe,
    title: 'インストール不要',
    desc: 'ブラウザだけで動作。PC・タブレット問わず、URLを開くだけで即使える',
  },
  {
    icon: icons.zap,
    title: '無料・アカウント不要',
    desc: '登録もログインも不要。今すぐ使い始められます',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">工</span>
            </div>
            <span className="text-lg font-bold text-gray-800">不動産工房</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1">
              {icons.x}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            不動産工房
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-3 max-w-2xl mx-auto leading-relaxed">
            不動産業務を効率化する、無料オンラインツール集
          </p>
          <p className="text-sm md:text-base opacity-75 mb-8 max-w-xl mx-auto">
            PDF編集・写真注釈・スタンプなど、日常業務で使えるツールを<br className="hidden sm:inline" />
            ブラウザだけで。アカウント登録不要・サーバー送信なし。
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {['サーバー送信なし', 'ブラウザ完結', 'アカウント不要', '完全無料'].map((point) => (
              <span key={point} className="bg-white/15 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                ✓ {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">ツール一覧</h2>
        <p className="text-center text-gray-400 text-sm mb-10">不動産業務に特化したツールを順次公開中</p>
        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div key={tool.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all ${
              tool.status === 'available' ? 'hover:shadow-lg hover:-translate-y-1' : 'opacity-60'
            }`}>
              <div className={`p-6 ${tool.status === 'available' ? '' : 'grayscale'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {tool.icon}
                  </div>
                  {tool.status === 'available' ? (
                    <span className="text-[10px] px-2.5 py-1 bg-green-50 text-green-600 rounded-full font-semibold">公開中</span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full font-semibold">準備中</span>
                  )}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{tool.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{tool.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tool.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-full">{tag}</span>
                  ))}
                </div>
                {tool.status === 'available' ? (
                  <Link href={tool.href}
                    className="block w-full text-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                    使ってみる →
                  </Link>
                ) : (
                  <span className="block w-full text-center px-4 py-2.5 bg-gray-100 text-gray-400 text-sm rounded-lg cursor-not-allowed">
                    Coming Soon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">不動産工房の特長</h2>
          <p className="text-center text-gray-400 text-sm mb-10">安心・簡単・無料で業務効率化</p>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA: PDF Editor */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-3 text-gray-800">まずはPDF編集ツールをお試しください</h2>
          <p className="text-gray-400 text-sm mb-6">墨消し・スタンプ・注釈など、物件資料の編集に必要な機能がすべて無料。</p>
          <Link href="/editor"
            className="inline-block px-10 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:scale-105 transition-all">
            PDF編集を始める →
          </Link>
        </div>
      </section>

      {/* Development CTA */}
      <section className="bg-gradient-to-r from-gray-800 to-gray-900 py-16 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-indigo-400">{icons.code}</span>
          </div>
          <h2 className="text-xl font-bold mb-3">このようなツール・アプリ開発を承ります</h2>
          <p className="text-sm text-gray-400 mb-2 leading-relaxed">
            「不動産工房」は、不動産×ITに取り組む開発者が制作しています。
          </p>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            業務効率化ツール・Webアプリ・社内システムなど、<br className="hidden sm:inline" />
            お気軽にご相談ください。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors border border-white/20">
              {icons.x}
              X (Twitter) で相談する
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-4">DMまたはリプライでお気軽にどうぞ</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-500 py-8 text-sm border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">工</span>
                </div>
                <span className="font-semibold text-gray-400">不動産工房</span>
              </div>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">不動産業務を効率化する無料ツール集</span>
            </div>
            <div className="flex items-center gap-5">
              <a href="https://x.com/" target="_blank" rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors" title="X (Twitter)">
                {icons.x}
              </a>
              <Link href="/privacy" className="hover:text-white transition-colors">プライバシー</Link>
              <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 text-center text-xs text-gray-600">
            アプリ開発・業務効率化ツールのご相談は
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 ml-1">
              X (Twitter)
            </a>
            までお気軽にどうぞ
          </div>
        </div>
      </footer>
    </div>
  )
}
