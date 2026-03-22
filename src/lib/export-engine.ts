import { PDFDocument } from 'pdf-lib'
import type { Annotation } from '@/types/annotations'
import { drawAnnotation } from './pdf-renderer'

function dataURLtoBytes(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export interface WatermarkOptions {
  text: string       // 透かしテキスト（例: "不動産工房"、有料版では自社名）
  enabled: boolean   // 透かし表示のON/OFF（有料版ではfalseに設定可能）
}

const DEFAULT_WATERMARK: WatermarkOptions = {
  text: '不動産工房',
  enabled: true,
}

export async function exportFlattenedPdf(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  annotations: Record<number, Annotation[]>,
  onProgress?: (current: number, total: number) => void,
  watermark: WatermarkOptions = DEFAULT_WATERMARK
): Promise<Uint8Array> {
  const newPdf = await PDFDocument.create()
  const exportScale = 2
  const totalPages = pdfDoc.numPages

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages)

    const pdfPage = await pdfDoc.getPage(pageNum)
    const viewport = pdfPage.getViewport({ scale: exportScale })

    // Render PDF page to canvas
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = viewport.width
    pageCanvas.height = viewport.height
    const pageCtx = pageCanvas.getContext('2d')!
    await pdfPage.render({ canvasContext: pageCtx, viewport }).promise

    // Draw annotations (coordinates are in PDF space, scale to export resolution)
    const pageAnnotations = annotations[pageNum] || []
    if (pageAnnotations.length > 0) {
      pageCtx.save()
      pageCtx.scale(exportScale, exportScale)
      for (const ann of pageAnnotations) {
        drawAnnotation(pageCtx, ann)
      }
      pageCtx.restore()
    }

    // Draw watermark (bottom-right corner)
    if (watermark.enabled && watermark.text) {
      pageCtx.save()
      const wmFontSize = Math.max(12, Math.min(viewport.width * 0.018, 24))
      pageCtx.font = `${wmFontSize}px "Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif`
      pageCtx.fillStyle = 'rgba(120, 120, 120, 0.45)'
      const textMetrics = pageCtx.measureText(watermark.text)
      const padding = wmFontSize * 0.8
      const x = viewport.width - textMetrics.width - padding
      const y = viewport.height - padding
      pageCtx.fillText(watermark.text, x, y)
      pageCtx.restore()
    }

    // Convert to JPEG
    const jpegDataUrl = pageCanvas.toDataURL('image/jpeg', 0.92)
    const jpegBytes = dataURLtoBytes(jpegDataUrl)
    const img = await newPdf.embedJpg(jpegBytes)

    // Add page
    const origViewport = pdfPage.getViewport({ scale: 1 })
    const page = newPdf.addPage([origViewport.width, origViewport.height])
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height,
    })
  }

  return newPdf.save()
}

export function downloadBlob(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
