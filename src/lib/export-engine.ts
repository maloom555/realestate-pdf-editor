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

export async function exportFlattenedPdf(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  annotations: Record<number, Annotation[]>,
  onProgress?: (current: number, total: number) => void
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
