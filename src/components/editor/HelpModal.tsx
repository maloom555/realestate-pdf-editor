'use client'

import { useState } from 'react'

const sections = [
  {
    title: 'ファイルを開く',
    items: [
      { icon: '📂', label: 'ドラッグ＆ドロップ', desc: 'PDF・JPG・PNG・WebPファイルをエディタにドラッグ＆ドロップ' },
      { icon: '📋', label: 'スクショ貼り付け', desc: 'PrintScreenで撮影 → エディタ上でCtrl+Vで直接貼り付け' },
      { icon: '🔄', label: '複数ファイル結合', desc: '複数ファイルを同時にドロップすると1つのPDFに自動結合' },
    ],
  },
  {
    title: '描画ツール',
    items: [
      { icon: '■', label: '墨消し', desc: 'ドラッグで黒塗り。個人情報の隠蔽に。エクスポート時にフラット化で復元不可', color: '#1a1a1a' },
      { icon: '○', label: '円', desc: 'ドラッグで楕円。Shift押しながらで正円', color: '#3b82f6' },
      { icon: '□', label: '四角', desc: 'ドラッグで四角形。角丸の設定可能', color: '#3b82f6' },
      { icon: '〰', label: '自由線', desc: 'フリーハンドで線を描画。矢印・破線にも対応', color: '#3b82f6' },
      { icon: '⌇', label: '折線', desc: 'クリックで頂点追加 → ダブルクリックで確定。閉じた図形・塗り・矢印対応', color: '#3b82f6' },
      { icon: '→', label: '矢印', desc: '始点→終点に矢印。線の太さ調整可能', color: '#3b82f6' },
      { icon: '🖍', label: 'ハイライト', desc: 'ドラッグで半透明のカラーハイライト。Shiftで水平・垂直固定', color: '#eab308' },
    ],
  },
  {
    title: 'テキスト・スタンプ',
    items: [
      { icon: 'A', label: 'テキスト', desc: 'クリックで入力開始。太字(B)・下線(U)・枠付き・フォント変更・角丸対応', color: '#dc2626' },
      { icon: '💬', label: '矢印テキスト', desc: '矢印付きテキスト。クリックでテキスト配置 → 黄色◆で矢印先を設定', color: '#dc2626' },
      { icon: '印', label: 'スタンプ', desc: '対象物件・当該地・最寄駅・成約済・方位マークなど。引出線付き', color: '#dc2626' },
      { icon: '✒', label: '署名スタンプ', desc: '会社情報のテンプレート。画像(ロゴ・名刺)も挿入可能', color: '#7c3aed' },
    ],
  },
  {
    title: '選択・編集',
    items: [
      { icon: '↖', label: '選択ツール', desc: '要素をクリックで選択。ドラッグで移動、ハンドルでリサイズ・回転' },
      { icon: '📋', label: 'コピー', desc: '選択中の要素を複製（ボタン or Ctrl+C）' },
      { icon: '↩', label: '戻す / やり直し', desc: 'Ctrl+Z で戻す、Ctrl+Y でやり直し' },
      { icon: '🗑', label: '削除', desc: '選択中の要素をDeleteキーまたは削除ボタンで削除' },
    ],
  },
  {
    title: 'キーボードショートカット',
    items: [
      { icon: '⌨', label: 'Ctrl + Z', desc: '元に戻す' },
      { icon: '⌨', label: 'Ctrl + Y', desc: 'やり直し' },
      { icon: '⌨', label: 'Ctrl + C', desc: '選択要素をコピー（自動貼付け）' },
      { icon: '⌨', label: 'Ctrl + V', desc: 'クリップボード画像を貼り付け' },
      { icon: '⌨', label: 'Delete', desc: '選択要素を削除' },
      { icon: '⌨', label: 'Shift + ドラッグ', desc: '正円 / 水平・垂直に固定' },
      { icon: '⌨', label: 'Shift + 回転', desc: '45度ずつスナップ回転' },
      { icon: '⌨', label: 'ダブルクリック', desc: 'テキスト・矢印テキストの再編集' },
    ],
  },
  {
    title: 'ページ編集',
    items: [
      { icon: '📄', label: 'ページ編集タブ', desc: '「ページ編集」タブに切り替えてページ単位の操作' },
      { icon: '↕', label: '並び替え', desc: 'サムネイルをドラッグで順序変更' },
      { icon: '🔄', label: '回転', desc: '選択ページを90°/180°回転' },
      { icon: '➕', label: '追加', desc: '空白ページ追加、別PDFの読み込み' },
      { icon: '✂', label: '抽出・削除', desc: '選択ページの抽出（別PDF）・削除・複製' },
    ],
  },
  {
    title: '保存・出力',
    items: [
      { icon: '💾', label: '自動保存', desc: '編集内容はブラウザに自動保存。次回アクセス時に復元' },
      { icon: '📥', label: 'PDFダウンロード', desc: '注釈をフラット化して出力。墨消しは完全除去され復元不可' },
      { icon: '📦', label: '圧縮', desc: '高品質/標準/軽量の3段階で圧縮' },
      { icon: '📁', label: 'プロジェクト保存', desc: '.rpefファイルとして保存。別PCでも続きから編集可能' },
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-sm">?</div>
            <h2 className="text-lg font-bold text-white">使い方ガイド</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto">
          {sections.map((section, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                activeSection === i
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-indigo-600 rounded-full" />
            {sections[activeSection].title}
          </h3>
          <div className="space-y-1">
            {sections[activeSection].items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: ('color' in item && item.color) ? `${item.color}15` : '#f3f4f6',
                    color: ('color' in item && item.color) || '#6b7280',
                  }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-700">{item.label}</div>
                  <div className="text-xs text-gray-400 leading-relaxed mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-center">
          <p className="text-[10px] text-gray-300">不動産PDF工房 - ブラウザで完結する無料PDF編集ツール</p>
        </div>
      </div>
    </div>
  )
}
