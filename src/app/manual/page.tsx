import { Metadata } from 'next'
import fs from 'fs'
import path from 'path'

export const metadata: Metadata = {
  title: '使い方マニュアル - 不動産PDF工房',
  description: '不動産PDF工房の使い方マニュアル。全ツール・ショートカット・FAQを掲載。',
}

export default function ManualPage() {
  // Read the HTML file at build time
  const htmlPath = path.join(process.cwd(), 'public', 'manual.html')
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
  // Extract body content only (between <body> and </body>)
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/)
  const bodyContent = bodyMatch ? bodyMatch[1] : ''
  // Extract style content
  const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  const styleContent = styleMatch ? styleMatch[1] : ''

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  )
}
