import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import ToastContainer from '@/components/ui/Toast'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: '不動産PDF工房 - 不動産業務を効率化する無料PDFツール',
  description:
    '不動産事業者のための無料業務ツール集。PDF墨消し・注釈・スタンプ、写真編集など、物件資料の作成・管理に必要な機能をブラウザだけで提供。サーバー送信なしで安全。',
  keywords: [
    '不動産', '業務効率化', 'PDF編集', '無料', 'オンライン',
    'PDF マスキング', '物件資料', '不動産ツール',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '不動産PDF工房',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen font-[Segoe_UI,Hiragino_Sans,Meiryo,sans-serif] overscroll-none">
        {children}
        <ToastContainer />
        <Analytics />
      </body>
    </html>
  )
}
