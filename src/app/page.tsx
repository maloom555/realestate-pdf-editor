import Link from 'next/link'

// SVG icon components for a clean, professional look
const icons = {
  mask: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="3" x2="21" y2="21"/></svg>,
  highlight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  pen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 17c3.333-3.333 5-5.667 7-6s3.333 1 5 0 3.667-3 5-4"/></svg>,
  circle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="9"/></svg>,
  rect: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>,
  polyline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="4 18 10 8 16 14 20 6"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/><circle cx="10" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/><circle cx="20" cy="6" r="1.5" fill="currentColor"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="13 5 19 5 19 11"/></svg>,
  text: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>,
  callout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  stamp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/></svg>,
  // Key features
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  zoom: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>,
  export: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>,
}

const toolGroups = [
  {
    category: 'マスキング・描画',
    items: [
      { icon: icons.mask, title: '墨消し', desc: '個人情報や機密情報を黒塗りで完全除去。フラット化エクスポートで復元不可能' },
      { icon: icons.highlight, title: 'ハイライト', desc: '重要箇所をカラーハイライトで強調。Shiftキーで水平・垂直固定' },
      { icon: icons.pen, title: '自由線', desc: 'フリーハンドで自由に線を描画。塗り・閉路にも対応' },
    ],
  },
  {
    category: '図形・矢印',
    items: [
      { icon: icons.circle, title: '円・楕円', desc: '丸で囲んで注目ポイントを強調。塗りつぶし・線幅の調整可能' },
      { icon: icons.rect, title: '四角形', desc: '四角で範囲を囲む。塗りつぶしにも対応' },
      { icon: icons.polyline, title: '折線', desc: 'クリックで頂点を追加、ダブルクリックで確定。閉路・塗り・矢印にも対応' },
      { icon: icons.arrow, title: '矢印', desc: '始点から終点へ矢印を描画。線の太さ調整可能' },
    ],
  },
  {
    category: 'テキスト・スタンプ',
    items: [
      { icon: icons.text, title: 'テキスト注釈', desc: '日本語フォント完全対応。太字・下線・テキストボックス枠付き' },
      { icon: icons.callout, title: '引出しテキスト', desc: '矢印付きのテキスト注釈。地図上のポイントに説明を追加' },
      { icon: icons.stamp, title: 'スタンプ', desc: '対象物件・当該地・最寄駅・境界確定済など不動産専用スタンプ。引出線付き' },
    ],
  },
]

const keyFeatures = [
  {
    icon: icons.image,
    title: 'PDF＋写真に対応',
    desc: 'PDFはもちろん、JPG・PNG・WebPの写真もそのまま読み込んで注釈を追加。物件写真への書き込みにも対応',
  },
  {
    icon: icons.save,
    title: '自動保存',
    desc: '編集内容はブラウザに自動保存。途中で閉じても、次回アクセス時に続きから作業可能',
  },
  {
    icon: icons.lock,
    title: '完全ローカル処理',
    desc: 'ファイルはサーバーに一切送信されません。すべての処理がお使いのブラウザ内で完結',
  },
  {
    icon: icons.undo,
    title: 'Undo/Redo対応',
    desc: 'Ctrl+Z / Ctrl+Yで操作を取り消し・やり直し。安心して編集できます',
  },
  {
    icon: icons.zoom,
    title: 'ズーム非依存の座標系',
    desc: '拡大・縮小しても注釈の位置がズレない。細かい部分もズームして正確に編集',
  },
  {
    icon: icons.export,
    title: 'フラット化PDF出力',
    desc: '注釈をPDFに焼き込んで出力。墨消し部分は完全に除去され復元不可能',
  },
]

const useCases = [
  {
    title: '物件資料への注釈',
    desc: '間取り図や現地写真にコメント・矢印・スタンプを追加。分かりやすい資料を素早く作成',
    tags: ['テキスト', '矢印', 'スタンプ'],
  },
  {
    title: '個人情報の墨消し',
    desc: 'AI送信前や外部共有前に、契約者名・住所・電話番号を完全にマスキング',
    tags: ['墨消し', 'フラット化出力'],
  },
  {
    title: '地図への書き込み',
    desc: '対象地・最寄駅のスタンプを配置し、引出線で地図上のポイントを指し示す',
    tags: ['スタンプ', '引出線', '円'],
  },
  {
    title: '重要事項の強調',
    desc: '重要事項説明書の要確認箇所をハイライトで強調。契約書の注意点を視覚的に共有',
    tags: ['ハイライト', 'テキスト'],
  },
  {
    title: '現地写真の整理',
    desc: 'JPG/PNGの現地写真を直接読み込み、矢印やテキストで指摘箇所を記入',
    tags: ['写真対応', '矢印', 'テキスト'],
  },
  {
    title: '社内回覧・承認',
    desc: '確認済・承認・却下などのスタンプを押印。機密文書・社外秘マークにも対応',
    tags: ['スタンプ', '文書管理'],
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            不動産PDF工房
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-3 max-w-2xl mx-auto leading-relaxed">
            不動産事業者のための無料オンライン編集ツール
          </p>
          <p className="text-sm md:text-base opacity-75 mb-8 max-w-xl mx-auto">
            PDF・写真に墨消し、スタンプ、テキスト注釈、ハイライトなど<br className="hidden sm:inline" />
            物件資料の編集に必要な機能を完備。ブラウザだけで完結。
          </p>
          <Link
            href="/editor"
            className="inline-block px-10 py-4 bg-white text-indigo-700 font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            今すぐ無料で使う →
          </Link>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            {[
              'サーバー送信なし',
              'ブラウザ内で完結',
              'アカウント不要',
              'PDF＋写真対応',
              '自動保存',
            ].map((point) => (
              <span key={point} className="bg-white/15 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                ✓ {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-3 text-gray-800">特長</h2>
        <p className="text-center text-gray-400 text-sm mb-10">他のオンラインPDFツールにはない、不動産業務に特化した機能</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {keyFeatures.map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-800 mb-1.5 text-sm">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-3 text-gray-800">搭載ツール一覧</h2>
          <p className="text-center text-gray-400 text-sm mb-10">11種類のツールで、あらゆる編集ニーズに対応</p>
          <div className="space-y-10">
            {toolGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold text-indigo-600 mb-4 uppercase tracking-wide">{group.category}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.items.map((item) => (
                    <div key={item.title} className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg">{item.icon}</span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-700 text-sm">{item.title}</h4>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-300 mt-6">＋ 選択ツール（移動・リサイズ・回転・削除）</p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-3 text-gray-800">活用シーン</h2>
          <p className="text-center text-gray-400 text-sm mb-10">不動産業務の様々な場面で</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {useCases.map((uc) => (
              <div key={uc.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-1.5 text-sm">{uc.title}</h3>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{uc.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {uc.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-800">使い方（3ステップ）</h2>
          <div className="space-y-6">
            {[
              { step: '1', title: 'ファイルを開く', desc: 'PDFまたは画像ファイル（JPG/PNG/WebP）をドラッグ＆ドロップ、またはファイル選択' },
              { step: '2', title: '編集する', desc: '墨消し・テキスト・スタンプ・矢印・ハイライトなど、必要なツールで注釈を追加。編集内容は自動保存' },
              { step: '3', title: 'PDFを出力', desc: '「マスク済みPDF出力」ボタンでフラット化PDFをダウンロード。墨消し部分は完全に除去' },
            ].map((s) => (
              <div key={s.step} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg">{s.step}</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 text-center text-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-3">今すぐ始めましょう</h2>
          <p className="opacity-80 mb-6 text-sm">アカウント登録不要。ブラウザだけで使える無料PDF・画像編集ツール。</p>
          <Link
            href="/editor"
            className="inline-block px-10 py-4 bg-white text-indigo-700 font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            PDF編集を始める →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8 text-sm">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>不動産PDF工房 - 不動産事業者のための無料PDF・画像編集ツール</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
              <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
