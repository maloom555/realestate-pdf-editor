import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '不動産工房 - 不動産業務を効率化する無料ツール集',
  description:
    '不動産事業者のための無料業務ツール集。PDF墨消し・注釈・スタンプ、写真編集など、物件資料の作成・管理に必要な機能をブラウザだけで提供。サーバー送信なしで安全。',
  keywords: [
    '不動産', '業務効率化', 'PDF編集', '無料', 'オンライン',
    'PDF マスキング', '物件資料', '不動産ツール',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen font-[Segoe_UI,Hiragino_Sans,Meiryo,sans-serif]">
        {children}
      </body>
    </html>
  )
}
