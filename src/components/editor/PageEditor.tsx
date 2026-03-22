'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import {
  reorderPages, deletePages, duplicatePage, addBlankPage,
  importPages, extractPages, rotatePages,
} from '@/lib/page-operations'
import { downloadBlob } from '@/lib/export-engine'

interface PageEditorProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy
  onReloadPdf: (newBytes: Uint8Array) => Promise<void>
}

export default function PageEditor({ pdfDoc, onReloadPdf }: PageEditorProps) {
  const store = useEditorStore()
  const { totalPages, selectedPages, annotations, pdfBytes } = store

  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map())
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragPageNum, setDragPageNum] = useState<number | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Render thumbnails
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    const renderThumbnails = async () => {
      const newThumbs = new Map<number, string>()
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) return
        try {
          const page = await pdfDoc.getPage(i)
          const viewport = page.getViewport({ scale: 0.3 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')!
          await page.render({ canvasContext: ctx, viewport }).promise
          newThumbs.set(i, canvas.toDataURL('image/jpeg', 0.7))
        } catch {
          // Skip failed pages
        }
      }
      if (!cancelled) setThumbnails(newThumbs)
    }
    renderThumbnails()
    return () => { cancelled = true }
  }, [pdfDoc])

  // Execute page operation with loading state
  const executeOp = useCallback(async (
    op: () => Promise<{ pdfBytes: Uint8Array; totalPages: number; annotations: Record<number, import('@/types/annotations').Annotation[]> }>,
    label: string
  ) => {
    store.setLoading(true, label)
    try {
      const result = await op()
      store.applyPageOperation(result.pdfBytes, result.totalPages, result.annotations)
      await onReloadPdf(result.pdfBytes)
    } catch (err) {
      alert('操作に失敗しました: ' + (err as Error).message)
    } finally {
      store.setLoading(false)
    }
  }, [store, onReloadPdf])

  // Handlers
  const handleDelete = () => {
    if (selectedPages.size === 0) return
    if (selectedPages.size >= totalPages) {
      alert('すべてのページを削除することはできません')
      return
    }
    if (!confirm(`${selectedPages.size}ページを削除しますか？`)) return
    executeOp(
      () => deletePages(pdfBytes!, annotations, Array.from(selectedPages)),
      'ページを削除中...'
    )
  }

  const handleDuplicate = () => {
    if (selectedPages.size !== 1) return
    const pageNum = Array.from(selectedPages)[0]
    executeOp(
      () => duplicatePage(pdfBytes!, annotations, pageNum),
      'ページを複製中...'
    )
  }

  const handleAddBlank = () => {
    const afterPage = selectedPages.size === 1
      ? Array.from(selectedPages)[0]
      : totalPages
    executeOp(
      () => addBlankPage(pdfBytes!, annotations, afterPage),
      '空白ページを追加中...'
    )
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const arrayBuffer = await file.arrayBuffer()
    const extBytes = new Uint8Array(arrayBuffer)
    const afterPage = selectedPages.size === 1
      ? Array.from(selectedPages)[0]
      : totalPages
    executeOp(
      () => importPages(pdfBytes!, annotations, extBytes, afterPage),
      'ページを読み込み中...'
    )
  }

  const handleExtract = async () => {
    if (selectedPages.size === 0) return
    store.setLoading(true, 'ページを抽出中...')
    try {
      const result = await extractPages(pdfBytes!, Array.from(selectedPages).sort((a, b) => a - b))
      const projectName = store.projectName || 'extracted'
      downloadBlob(result, `${projectName}_pages.pdf`, 'application/pdf')
    } catch (err) {
      alert('抽出に失敗しました: ' + (err as Error).message)
    } finally {
      store.setLoading(false)
    }
  }

  const handleRotate = (deg: 90 | 180 | 270) => {
    if (selectedPages.size === 0) return
    executeOp(
      () => rotatePages(pdfBytes!, annotations, Array.from(selectedPages), deg),
      'ページを回転中...'
    )
  }

  // Drag-to-reorder (pointer events for touch support)
  const handleDragStart = (pageNum: number) => {
    setDragPageNum(pageNum)
  }

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    setDragOverIndex(targetIdx)
  }

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    if (dragPageNum === null || dragPageNum === targetIdx + 1) {
      setDragPageNum(null)
      return
    }

    // Build new order
    const order = Array.from({ length: totalPages }, (_, i) => i + 1)
    const fromIdx = order.indexOf(dragPageNum)
    order.splice(fromIdx, 1)
    const insertAt = targetIdx > fromIdx ? targetIdx - 1 : targetIdx
    order.splice(insertAt >= 0 ? insertAt : 0, 0, dragPageNum)

    setDragPageNum(null)
    executeOp(
      () => reorderPages(pdfBytes!, annotations, order),
      'ページを並び替え中...'
    )
  }

  const handleDragEnd = () => {
    setDragPageNum(null)
    setDragOverIndex(null)
  }

  // Select all / deselect
  const handleSelectAll = () => {
    if (selectedPages.size === totalPages) store.clearPageSelection()
    else store.selectAllPages()
  }

  const [showRotateMenu, setShowRotateMenu] = useState(false)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Action bar */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 flex-wrap">
        <button onClick={handleSelectAll}
          className="px-3 py-1.5 text-sm sm:text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          {selectedPages.size === totalPages ? '選択解除' : '全選択'}
        </button>
        {selectedPages.size > 0 && (
          <span className="text-sm sm:text-xs text-indigo-600 font-semibold">{selectedPages.size}ページ選択中</span>
        )}

        <div className="w-px h-5 bg-gray-200" />

        <button onClick={handleDelete} disabled={selectedPages.size === 0}
          className="px-3 py-1.5 text-sm sm:text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed">
          削除
        </button>
        <button onClick={handleDuplicate} disabled={selectedPages.size !== 1}
          className="px-3 py-1.5 text-sm sm:text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
          複製
        </button>
        <button onClick={handleAddBlank}
          className="px-3 py-1.5 text-sm sm:text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
          空白追加
        </button>
        <button onClick={() => importInputRef.current?.click()}
          className="px-3 py-1.5 text-sm sm:text-xs border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
          PDF読込
        </button>
        <input ref={importInputRef} type="file" accept=".pdf" className="hidden" onChange={handleImport} />

        <button onClick={handleExtract} disabled={selectedPages.size === 0}
          className="px-3 py-1.5 text-sm sm:text-xs border border-green-300 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-30 disabled:cursor-not-allowed">
          抽出
        </button>

        {/* Rotate dropdown */}
        <div className="relative">
          <button onClick={() => setShowRotateMenu(!showRotateMenu)} disabled={selectedPages.size === 0}
            className="px-3 py-1.5 text-sm sm:text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
            回転 ▾
          </button>
          {showRotateMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button onClick={() => { handleRotate(90); setShowRotateMenu(false) }}
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">90° 右回転</button>
              <button onClick={() => { handleRotate(180); setShowRotateMenu(false) }}
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">180° 回転</button>
              <button onClick={() => { handleRotate(270); setShowRotateMenu(false) }}
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">90° 左回転</button>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail grid */}
      <div className="flex-1 min-h-0 overflow-auto p-4 bg-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isSelected = selectedPages.has(pageNum)
            const isDragTarget = dragOverIndex === pageNum - 1
            const thumbUrl = thumbnails.get(pageNum)
            const hasAnnotations = (annotations[pageNum] || []).length > 0

            return (
              <div
                key={pageNum}
                draggable
                onDragStart={() => handleDragStart(pageNum)}
                onDragOver={(e) => handleDragOver(e, pageNum - 1)}
                onDrop={(e) => handleDrop(e, pageNum - 1)}
                onDragEnd={handleDragEnd}
                onClick={() => store.togglePageSelection(pageNum)}
                className={`relative cursor-pointer rounded-xl overflow-hidden transition-all
                  ${isSelected ? 'ring-3 ring-indigo-500 shadow-lg scale-[1.02]' : 'ring-1 ring-gray-200 hover:ring-indigo-300 hover:shadow-md'}
                  ${isDragTarget ? 'ring-3 ring-yellow-400' : ''}
                  ${dragPageNum === pageNum ? 'opacity-40' : ''}
                `}
              >
                {/* Thumbnail */}
                <div className="bg-white aspect-[3/4] flex items-center justify-center p-1">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={`Page ${pageNum}`} className="max-w-full max-h-full object-contain" draggable={false} />
                  ) : (
                    <div className="text-gray-300 text-sm">読込中...</div>
                  )}
                </div>

                {/* Page number label */}
                <div className={`text-center py-1.5 text-xs font-medium ${isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-50 text-gray-600'}`}>
                  {pageNum}
                  {hasAnnotations && <span className="ml-1 text-[10px]">✎</span>}
                </div>

                {/* Selection checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
