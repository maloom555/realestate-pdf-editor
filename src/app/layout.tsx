import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '不動産PDF工房 - 無料オンラインPDF編集ツール',
  description:
    '不動産事業者向け無料PDF編集ツール。墨消し、テキスト注釈、電子印鑑、ハイライト、PDF結合・分割など、物件資料の編集に必要な機能を完備。ファイルはサーバーに送信されないため安全です。',
  keywords: [
    'PDF編集', '無料', 'オンライン', '不動産', 'PDF マスキング',
    '電子印鑑', 'PDF ハンコ', '物件資料', 'PDF結合', 'PDF分割',
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
