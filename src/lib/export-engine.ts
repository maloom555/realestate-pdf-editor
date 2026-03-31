import { PDFDocument } from 'pdf-lib'
import type { Annotation } from '@/types/annotations'
import { drawAnnotation, preloadImageCache } from './pdf-renderer'

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

export type PageNumberPosition = 'none' | 'bottom-center' | 'bottom-right' | 'bottom-left'

export interface ExportOptions {
  watermark?: WatermarkOptions
  pageNumbers?: PageNumberPosition  // ページ番号の位置
}

const DEFAULT_WATERMARK: WatermarkOptions = {
  text: '不動産PDF工房',
  enabled: false,
}

export async function exportFlattenedPdf(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  annotations: Record<number, Annotation[]>,
  onProgress?: (current: number, total: number) => void,
  watermark: WatermarkOptions = DEFAULT_WATERMARK,
  pageNumbers: PageNumberPosition = 'none'
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
      // Pre-load images for image annotations
      for (const ann of pageAnnotations) {
        if (ann.type === 'image' && ann.data.imageData) {
          await new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
                preloadImageCache(ann.data.imageData, img)
              resolve()
            }
            img.onerror = () => resolve()
            img.src = ann.data.imageData
          })
        }
      }
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

    // Draw page numbers
    if (pageNumbers !== 'none') {
      pageCtx.save()
      const pnFontSize = Math.max(14, Math.min(viewport.width * 0.02, 28))
      pageCtx.font = `${pnFontSize}px "Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif`
      pageCtx.fillStyle = 'rgba(80, 80, 80, 0.6)'
      const pageText = `${pageNum} / ${totalPages}`
      const textMetrics = pageCtx.measureText(pageText)
      const padding = pnFontSize * 1.2
      let pnX: number
      if (pageNumbers === 'bottom-center') {
        pnX = (viewport.width - textMetrics.width) / 2
      } else if (pageNumbers === 'bottom-left') {
        pnX = padding
      } else {
        // bottom-right (offset from watermark)
        pnX = viewport.width - textMetrics.width - padding
      }
      const pnY = viewport.height - padding * 0.6
      // Draw white background pill
      pageCtx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      const bgPad = pnFontSize * 0.3
      pageCtx.beginPath()
      pageCtx.roundRect(pnX - bgPad, pnY - pnFontSize - bgPad, textMetrics.width + bgPad * 2, pnFontSize + bgPad * 2, 4)
      pageCtx.fill()
      // Draw text
      pageCtx.fillStyle = 'rgba(80, 80, 80, 0.7)'
      pageCtx.fillText(pageText, pnX, pnY)
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

export type CompressionLevel = 'high' | 'standard' | 'light'

/**
 * Compress a PDF by re-rendering pages at lower quality.
 * high = 0.55 JPEG, scale 1.2 (smallest file)
 * standard = 0.72 JPEG, scale 1.5
 * light = 0.85 JPEG, scale 1.8 (best quality)
 */
export async function compressPdf(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  level: CompressionLevel,
  onProgress?: (current: number, total: number) => void,
  originalBytes?: Uint8Array
): Promise<Uint8Array> {
  const settings = {
    high:     { scale: 1.2, quality: 0.55 },
    standard: { scale: 1.5, quality: 0.72 },
    light:    { scale: 1.8, quality: 0.85 },
  }
  const { scale, quality } = settings[level]

  // Step 1: Try lossless re-save first (removes metadata, optimizes structure)
  if (originalBytes) {
    try {
      const existingPdf = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
      const losslessBytes = await existingPdf.save()
      // If lossless re-save is already smaller, and level is 'light', use it
      if (level === 'light' && losslessBytes.length < originalBytes.length) {
        return losslessBytes
      }
    } catch {
      // Fall through to JPEG compression
    }
  }

  // Step 2: JPEG compression (lossy)
  const newPdf = await PDFDocument.create()
  const totalPages = pdfDoc.numPages

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages)
    const pdfPage = await pdfDoc.getPage(pageNum)
    const viewport = pdfPage.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await pdfPage.render({ canvasContext: ctx, viewport }).promise

    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality)
    const jpegBytes = dataURLtoBytes(jpegDataUrl)
    const img = await newPdf.embedJpg(jpegBytes)

    const origViewport = pdfPage.getViewport({ scale: 1 })
    const page = newPdf.addPage([origViewport.width, origViewport.height])
    page.drawImage(img, { x: 0, y: 0, width: origViewport.width, height: origViewport.height })
  }

  const compressedBytes = await newPdf.save()

  // Step 3: If compressed is larger than original, return original
  if (originalBytes && compressedBytes.length >= originalBytes.length) {
    return originalBytes
  }

  return compressedBytes
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
