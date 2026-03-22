import { PDFDocument, degrees } from 'pdf-lib'
import type { Annotation } from '@/types/annotations'
import { generateId } from '@/lib/id'

export interface PageOperationResult {
  pdfBytes: Uint8Array
  totalPages: number
  annotations: Record<number, Annotation[]>
}

/** Remap annotation keys from old page numbers to new page numbers */
function remapAnnotations(
  annotations: Record<number, Annotation[]>,
  mapping: Map<number, number>
): Record<number, Annotation[]> {
  const result: Record<number, Annotation[]> = {}
  for (const [oldPage, newPage] of mapping) {
    if (annotations[oldPage] && annotations[oldPage].length > 0) {
      result[newPage] = annotations[oldPage]
    }
  }
  return result
}

/** Deep-clone annotations with fresh IDs */
function cloneAnnotations(anns: Annotation[]): Annotation[] {
  return anns.map((a) => ({
    ...JSON.parse(JSON.stringify(a)),
    id: generateId(),
  }))
}

/** Reorder pages by providing the new order as array of original page numbers (1-based) */
export async function reorderPages(
  pdfBytes: Uint8Array,
  annotations: Record<number, Annotation[]>,
  newOrder: number[]
): Promise<PageOperationResult> {
  const srcDoc = await PDFDocument.load(pdfBytes)
  const newDoc = await PDFDocument.create()

  for (const origPageNum of newOrder) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [origPageNum - 1])
    newDoc.addPage(copiedPage)
  }

  const mapping = new Map<number, number>()
  newOrder.forEach((origPage, idx) => mapping.set(origPage, idx + 1))

  const newPdfBytes = await newDoc.save()
  return {
    pdfBytes: new Uint8Array(newPdfBytes),
    totalPages: newOrder.length,
    annotations: remapAnnotations(annotations, mapping),
  }
}

/** Delete specified pages (1-based page numbers) */
export async function deletePages(
  pdfBytes: Uint8Array,
  annotations: Record<number, Annotation[]>,
  pageNums: number[]
): Promise<PageOperationResult> {
  const srcDoc = await PDFDocument.load(pdfBytes)
  const totalPages = srcDoc.getPageCount()
  if (pageNums.length >= totalPages) {
    throw new Error('すべてのページを削除することはできません')
  }

  const deleteSet = new Set(pageNums)
  const remaining: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (!deleteSet.has(i)) remaining.push(i)
  }

  const newDoc = await PDFDocument.create()
  for (const origPageNum of remaining) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [origPageNum - 1])
    newDoc.addPage(copiedPage)
  }

  const mapping = new Map<number, number>()
  remaining.forEach((origPage, idx) => mapping.set(origPage, idx + 1))

  const newPdfBytes = await newDoc.save()
  return {
    pdfBytes: new Uint8Array(newPdfBytes),
    totalPages: remaining.length,
    annotations: remapAnnotations(annotations, mapping),
  }
}

/** Duplicate a page (1-based), inserting the copy right after the original */
export async function duplicatePage(
  pdfBytes: Uint8Array,
  annotations: Record<number, Annotation[]>,
  pageNum: number
): Promise<PageOperationResult> {
  const srcDoc = await PDFDocument.load(pdfBytes)
  const totalPages = srcDoc.getPageCount()

  const newDoc = await PDFDocument.create()
  const allIndices = Array.from({ length: totalPages }, (_, i) => i)
  const copiedPages = await newDoc.copyPages(srcDoc, allIndices)

  const newAnnotations: Record<number, Annotation[]> = {}
  let newPageIdx = 1

  for (let i = 0; i < totalPages; i++) {
    newDoc.addPage(copiedPages[i])
    if (annotations[i + 1]) newAnnotations[newPageIdx] = annotations[i + 1]
    newPageIdx++

    if (i + 1 === pageNum) {
      // Insert duplicate
      const [dupPage] = await newDoc.copyPages(srcDoc, [i])
      newDoc.addPage(dupPage)
      // Clone annotations for the duplicate
      if (annotations[pageNum]) {
        newAnnotations[newPageIdx] = cloneAnnotations(annotations[pageNum])
      }
      newPageIdx++
    }
  }

  const newPdfBytes = await newDoc.save()
  return {
    pdfBytes: new Uint8Array(newPdfBytes),
    totalPages: totalPages + 1,
    annotations: newAnnotations,
  }
}

/** Add a blank page after the specified page (1-based). afterPage=0 means at the beginning. */
export async function addBlankPage(
  pdfBytes: Uint8Array,
  annotations: Record<number, Annotation[]>,
  afterPage: number,
  width = 595.28,
  height = 841.89
): Promise<PageOperationResult> {
  const doc = await PDFDocument.load(pdfBytes)
  const totalPages = doc.getPageCount()

  // Insert blank page at the specified position
  doc.insertPage(afterPage, [width, height])

  // Remap annotations: pages after insertion shift by 1
  const newAnnotations: Record<number, Annotation[]> = {}
  for (let i = 1; i <= totalPages; i++) {
    if (annotations[i]) {
      const newPageNum = i <= afterPage ? i : i + 1
      newAnnotations[newPageNum] = annotations[i]
    }
  }

  const newPdfBytes = await doc.save()
  return {
    pdfBytes: new Uint8Array(newPdfBytes),
    totalPages: totalPages + 1,
    annotations: newAnnotations,
  }
}

/** Import all pages from an external PDF after the specified page */
export async function importPages(
  pdfBytes: Uint8Array,
  annotations: Record<number, Annotation[]>,
  externalPdfBytes: Uint8Array,
  afterPage: number
): Promise<PageOperationResult> {
  const mainDoc = await PDFDocument.load(pdfBytes)
  const extDoc = await PDFDocument.load(externalPdfBytes)
  const mainTotal = mainDoc.getPageCount()
  const extTotal = extDoc.getPageCount()

  // Copy all external pages
  const extIndices = Array.from({ length: extTotal }, (_, i) => i)
  const copiedPages = await mainDoc.copyPages(extDoc, extIndices)

  // Insert them after the specified page (in reverse to maintain order)
  for (let i = copiedPages.length - 1; i >= 0; i--) {
    mainDoc.insertPage(afterPage, copiedPages[i])
  }

  // Remap annotations
  const newAnnotations: Record<number, Annotation[]> = {}
  for (let i = 1; i <= mainTotal; i++) {
    if (annotations[i]) {
      const newPageNum = i <= afterPage ? i : i + extTotal
      newAnnotations[newPageNum] = annotations[i]
    }
  }

  const newPdfBytes = await mainDoc.save()
  return {
    pdfBytes: new Uint8Array(newPdfBytes),
    totalPages: mainTotal + extTotal,
    annotations: newAnnotations,
  }
}

/** Extract specified pages into a separate PDF for download (does not modify original) */
export async function extractPages(
  pdfBytes: Uint8Array,
  pageNums: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes)
  const newDoc = await PDFDocument.create()

  const indices = pageNums.map((p) => p - 1)
  const copiedPages = await newDoc.copyPages(srcDoc, indices)
  for (const page of copiedPages) {
    newDoc.addPage(page)
  }

  const result = await newDoc.save()
  return new Uint8Array(result)
}

/** Rotate specified pages by given degrees */
export async function rotatePages(
  pdfBytes: Uint8Array,
  annotations: Record<number, Annotation[]>,
  pageNums: number[],
  rotation: 90 | 180 | 270
): Promise<PageOperationResult> {
  const doc = await PDFDocument.load(pdfBytes)

  for (const pageNum of pageNums) {
    const page = doc.getPage(pageNum - 1)
    const currentRotation = page.getRotation().angle
    page.setRotation(degrees((currentRotation + rotation) % 360))
  }

  const newPdfBytes = await doc.save()
  return {
    pdfBytes: new Uint8Array(newPdfBytes),
    totalPages: doc.getPageCount(),
    annotations: { ...annotations }, // Annotations stay as-is, rotation is page-level
  }
}
