'use client'

import { useState, type ReactNode } from 'react'

// Inline SVG icons matching the actual toolbar
const Icons = {
  mask: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  circle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="9"/></svg>,
  rect: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>,
  pen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 17c3.333-3.333 5-5.667 7-6s3.333 1 5 0 3.667-3 5-4"/></svg>,
  polyline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="4 18 10 8 16 14 20 6"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/><circle cx="10" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/><circle cx="20" cy="6" r="1.5" fill="currentColor"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="13 5 19 5 19 11"/></svg>,
  highlight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  text: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>,
  callout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  stamp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  select: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M4 4l7 18 2.5-7.5L21 12z"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  file: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 5 17 10"/><line x1="12" y1="5" x2="12" y2="15"/></svg>,
  clipboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
  merge: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M8 6H4v16h8V10"/><path d="M12 2h8v16h-4"/><path d="M12 2v8h8"/></svg>,
  page: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>,
  sort: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/></svg>,
  rotate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  scissors: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  compress: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  folder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  signature: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 17c3-3 5-7 8-7s3 4 5 4 3-2 5-4"/><line x1="3" y1="21" x2="21" y2="21"/></svg>,
}

// Key cap component
const Key = ({ children }: { children: string }) => (
  <span className="inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[11px] font-mono text-gray-600 shadow-sm leading-none">{children}</span>
)

// Hint label component
const Hint = ({ children }: { children: ReactNode }) => (
  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-500 text-[11px] rounded-md">{children}</span>
)

interface HelpItem {
  icon: ReactNode
  label: string
  desc: ReactNode
  color?: string
}

interface HelpSection {
  title: string
  icon: ReactNode
  items: HelpItem[]
}

const sections: HelpSection[] = [
  {
    title: 'ファイルを開く',
    icon: Icons.file,
    items: [
      {
        icon: Icons.upload, label: 'ドラッグ＆ドロップ', color: '#4f46e5',
        desc: <>ファイルを<b>ドラッグ＆ドロップ</b>するか、「ファイルを選択」ボタンからPDFを開きます。<br/><Hint>PDF・JPG・PNG・WebP に対応</Hint></>,
      },
      {
        icon: Icons.clipboard, label: 'スクリーンショット貼り付け', color: '#4f46e5',
        desc: <><Key>PrintScreen</Key> でスクリーンショットを撮影 → エディタ上で <Key>Ctrl</Key> + <Key>V</Key><br/><Hint>地図やWebページのキャプチャをそのまま編集できます</Hint></>,
      },
      {
        icon: Icons.merge, label: '複数ファイル結合', color: '#4f46e5',
        desc: <>複数ファイルを同時にドロップすると<b>1つのPDFに自動結合</b><br/><Hint>PDF + 写真の混在もOK</Hint></>,
      },
    ],
  },
  {
    title: '描画ツール',
    icon: Icons.pen,
    items: [
      {
        icon: Icons.mask, label: '墨消し', color: '#1a1a1a',
        desc: <>ドラッグで四角形の墨消しを作成。連続で何個でも描けます。<br/><Hint>エクスポート時にフラット化 → 復元不可能</Hint></>,
      },
      {
        icon: Icons.circle, label: '円', color: '#3b82f6',
        desc: <>ドラッグで楕円を描画。塗り・破線にも対応。<br/><Hint><Key>Shift</Key> + ドラッグ → 正円</Hint></>,
      },
      {
        icon: Icons.rect, label: '四角', color: '#3b82f6',
        desc: <>ドラッグで四角形。塗り・破線・角丸に対応。<br/><Hint>角丸スライダーで角の丸みを調整</Hint></>,
      },
      {
        icon: Icons.pen, label: '自由線', color: '#3b82f6',
        desc: <>フリーハンドで線を描画。矢印・破線にも対応。<br/><Hint>線の端に矢印を付けられます</Hint></>,
      },
      {
        icon: Icons.polyline, label: '折線', color: '#3b82f6',
        desc: <>クリックで頂点を追加、ダブルクリックで確定。<br/><Hint>閉じた図形・塗り・矢印 対応 / <Key>Del</Key> で一つ戻る</Hint></>,
      },
      {
        icon: Icons.arrow, label: '矢印', color: '#3b82f6',
        desc: <>始点から終点へドラッグで矢印を描画。<br/><Hint>線の太さ・色を自由に調整</Hint></>,
      },
      {
        icon: Icons.highlight, label: 'ハイライト', color: '#eab308',
        desc: <>ドラッグで半透明のカラーハイライト。<br/><Hint><Key>Shift</Key> + ドラッグ → 水平・垂直に固定</Hint></>,
      },
    ],
  },
  {
    title: 'テキスト・スタンプ',
    icon: Icons.text,
    items: [
      {
        icon: Icons.text, label: 'テキスト', color: '#dc2626',
        desc: <>クリックした位置にテキストを入力。<br/><Hint><b>B</b> 太字 / <b>U</b> 下線 / 枠付き / フォント変更 / 角丸</Hint></>,
      },
      {
        icon: Icons.callout, label: '矢印テキスト', color: '#dc2626',
        desc: <>矢印付きのテキスト注釈。クリックで配置 → 黄色◆で矢印先を指定。<br/><Hint>ダブルクリックで再編集</Hint></>,
      },
      {
        icon: Icons.stamp, label: 'スタンプ', color: '#dc2626',
        desc: <>対象物件・当該地・最寄駅・成約済・商談中・方位マークなど。<br/><Hint>引出線を付けて対象を指し示せます</Hint></>,
      },
      {
        icon: Icons.signature, label: '署名スタンプ', color: '#7c3aed',
        desc: <>会社情報のテンプレートスタンプ。変数（名前・電話番号等）対応。<br/><Hint>画像（ロゴ・名刺）も挿入可能 / 枠線ON/OFF</Hint></>,
      },
    ],
  },
  {
    title: '選択・編集',
    icon: Icons.select,
    items: [
      {
        icon: Icons.select, label: '選択', color: '#4f46e5',
        desc: <>要素をクリックで選択。ドラッグで移動。<br/><Hint>角のハンドル → リサイズ / 上のハンドル → 回転</Hint></>,
      },
      {
        icon: Icons.copy, label: 'コピー', color: '#4f46e5',
        desc: <>選択中の要素を複製。ボタンまたは <Key>Ctrl</Key> + <Key>C</Key><br/><Hint>コピーすると自動的に少しずらして貼り付けされます</Hint></>,
      },
      {
        icon: Icons.undo, label: '戻す / やり直し', color: '#4f46e5',
        desc: <><Key>Ctrl</Key> + <Key>Z</Key> で戻す、<Key>Ctrl</Key> + <Key>Y</Key> でやり直し</>,
      },
      {
        icon: Icons.trash, label: '削除', color: '#dc2626',
        desc: <>選択中の要素を <Key>Delete</Key> キーまたは削除ボタンで削除</>,
      },
    ],
  },
  {
    title: 'ショートカット',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10.01"/><line x1="10" y1="10" x2="10" y2="10.01"/><line x1="14" y1="10" x2="14" y2="10.01"/><line x1="18" y1="10" x2="18" y2="10.01"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
    items: [
      { icon: <></>, label: '', color: undefined, desc: <><Key>Ctrl</Key> + <Key>Z</Key>　元に戻す</> },
      { icon: <></>, label: '', color: undefined, desc: <><Key>Ctrl</Key> + <Key>Y</Key>　やり直し</> },
      { icon: <></>, label: '', color: undefined, desc: <><Key>Ctrl</Key> + <Key>C</Key>　選択要素をコピー（自動貼付け）</> },
      { icon: <></>, label: '', color: undefined, desc: <><Key>Ctrl</Key> + <Key>V</Key>　クリップボード画像を貼り付け</> },
      { icon: <></>, label: '', color: undefined, desc: <><Key>Delete</Key>　選択要素を削除</> },
      { icon: <></>, label: '', color: undefined, desc: <><Key>Shift</Key> + ドラッグ　正円 / 水平・垂直に固定</> },
      { icon: <></>, label: '', color: undefined, desc: <><Key>Shift</Key> + 回転　45度ずつスナップ</> },
      { icon: <></>, label: '', color: undefined, desc: <>ダブルクリック　テキスト・矢印テキストの再編集</> },
    ],
  },
  {
    title: 'ページ編集',
    icon: Icons.page,
    items: [
      {
        icon: Icons.page, label: 'ページ編集タブ', color: '#4f46e5',
        desc: <>「ページ編集」タブに切り替えてページ単位の操作</>,
      },
      {
        icon: Icons.sort, label: '並び替え', color: '#4f46e5',
        desc: <>サムネイルをドラッグで順序変更</>,
      },
      {
        icon: Icons.rotate, label: '回転', color: '#4f46e5',
        desc: <>選択ページを90°右/左、180°回転</>,
      },
      {
        icon: Icons.plus, label: '追加', color: '#059669',
        desc: <>空白ページの追加、別PDFの読み込み</>,
      },
      {
        icon: Icons.scissors, label: '抽出・削除', color: '#dc2626',
        desc: <>選択ページを別PDFとして抽出、削除、複製</>,
      },
    ],
  },
  {
    title: '保存・出力',
    icon: Icons.save,
    items: [
      {
        icon: Icons.save, label: '自動保存', color: '#059669',
        desc: <>編集内容はブラウザに自動保存。次回アクセス時に続きから作業可能。<br/><Hint>ブラウザのデータを消去すると失われます</Hint></>,
      },
      {
        icon: Icons.download, label: 'PDFダウンロード', color: '#4f46e5',
        desc: <>注釈をPDFにフラット化して出力。<br/><Hint>墨消し部分は完全に除去され復元不可能</Hint></>,
      },
      {
        icon: Icons.compress, label: '圧縮', color: '#ea580c',
        desc: <>高品質 / 標準 / 軽量の3段階でPDFを圧縮<br/><Hint>元より大きくなる場合は元ファイルを維持</Hint></>,
      },
      {
        icon: Icons.folder, label: 'プロジェクト保存', color: '#7c3aed',
        desc: <>.rpefファイルとして保存。別PCでも「読込」から続きを編集可能</>,
      },
    ],
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: Props) {
  const [activeSection, setActiveSection] = useState(0)

  if (!isOpen) return null

  const section = sections[activeSection]
  const isShortcutSection = section.title === 'ショートカット'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">使い方ガイド</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <hr className="border-gray-100" />

        {/* Section tabs */}
        <div className="flex gap-1 px-4 py-2 bg-gray-50/50 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                activeSection === i
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Section heading with icon */}
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2.5">
            <span className="w-1 h-5 bg-indigo-600 rounded-full" />
            <span className="text-indigo-600">{section.icon}</span>
            {section.title}
          </h3>

          {isShortcutSection ? (
            /* Shortcuts: compact list */
            <div className="space-y-2.5 pl-2">
              {section.items.map((item, i) => (
                <div key={i} className="text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </div>
              ))}
            </div>
          ) : (
            /* Regular items */
            <div className="space-y-0.5">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3.5 py-3 border-b border-gray-50 last:border-0">
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: item.color ? `${item.color}12` : '#f3f4f6',
                      color: item.color || '#6b7280',
                    }}
                  >
                    {item.icon}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-indigo-700 mb-0.5">{item.label}</div>
                    <div className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 text-center">
          <p className="text-[10px] text-gray-300">不動産PDF工房 - ブラウザで完結する無料PDF編集ツール</p>
        </div>
      </div>
    </div>
  )
}
