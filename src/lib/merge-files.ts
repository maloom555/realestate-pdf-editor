import { PDFDocument } from 'pdf-lib'
import { imageToPdf } from './image-to-pdf'

/**
 * Merge multiple files (PDFs and images) into a single PDF.
 * Images are converted to single-page PDFs first.
 */
export async function mergeFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length)
    const file = files[i]
    const arrayBuffer = await file.arrayBuffer()
    let pdfBytes: Uint8Array

    if (imageTypes.includes(file.type)) {
      // Convert image to PDF
      const imgBytes = new Uint8Array(arrayBuffer)
      pdfBytes = new Uint8Array(await imageToPdf(imgBytes, file.type))
    } else {
      pdfBytes = new Uint8Array(arrayBuffer)
    }

    // Load and copy all pages
    const srcDoc = await PDFDocument.load(pdfBytes)
    const indices = Array.from({ length: srcDoc.getPageCount() }, (_, j) => j)
    const copiedPages = await mergedPdf.copyPages(srcDoc, indices)
    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }
  }

  return new Uint8Array(await mergedPdf.save())
}
