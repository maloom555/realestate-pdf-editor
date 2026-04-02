'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { showToast } from '@/components/ui/Toast'
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
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set())
  const importInputRef = useRef<HTMLInputElement>(null)
  const thumbRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const renderingRef = useRef<Set<number>>(new Set())

  // IntersectionObserver for lazy thumbnail loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visiblePages)
        let changed = false
        for (const entry of entries) {
          const pageNum = Number(entry.target.getAttribute('data-page'))
          if (entry.isIntersecting && !newVisible.has(pageNum)) {
            newVisible.add(pageNum)
            changed = true
          }
        }
        if (changed) setVisiblePages(newVisible)
      },
      { rootMargin: '200px' } // Pre-load 200px before visible
    )

    thumbRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [totalPages, pdfDoc, visiblePages])

  // Render only visible thumbnails, in batches
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false

    const renderBatch = async () => {
      const toRender = Array.from(visiblePages).filter(
        (p) => !thumbnails.has(p) && !renderingRef.current.has(p)
      )
      if (toRender.length === 0) return

      for (const pageNum of toRender) {
        if (cancelled) return
        renderingRef.current.add(pageNum)
        try {
          const page = await pdfDoc.getPage(pageNum)
          const viewport = page.getViewport({ scale: 0.3 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')!
          await page.render({ canvasContext: ctx, viewport }).promise
          if (!cancelled) {
            setThumbnails((prev) => {
              const next = new Map(prev)
              next.set(pageNum, canvas.toDataURL('image/jpeg', 0.6))
              return next
            })
          }
        } catch {
          // Skip failed pages
        } finally {
          renderingRef.current.delete(pageNum)
        }
        // Yield to UI between pages
        await new Promise((r) => requestAnimationFrame(r))
      }
    }

    renderBatch()
    return () => { cancelled = true }
  }, [pdfDoc, visiblePages, thumbnails])

  // Clear thumbnails when pdfDoc changes
  useEffect(() => {
    setThumbnails(new Map())
    setVisiblePages(new Set())
    renderingRef.current.clear()
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
      showToast('操作に失敗しました: ' + (err as Error).message, 'error')
    } finally {
      store.setLoading(false)
    }
  }, [store, onReloadPdf])

  // Handlers
  const handleDelete = () => {
    if (selectedPages.size === 0) return
    if (selectedPages.size >= totalPages) {
      showToast('すべてのページを削除することはできません', 'error')
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
    let extBytes: Uint8Array = new Uint8Array(arrayBuffer)

    // If image file, convert to PDF first
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (imageTypes.includes(file.type)) {
      const { imageToPdf } = await import('@/lib/image-to-pdf')
      extBytes = new Uint8Array(await imageToPdf(extBytes, file.type))
    }

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
      showToast('抽出に失敗しました: ' + (err as Error).message, 'error')
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

  const handleUndo = async () => {
    const entry = store.undoPageOperation()
    if (entry) {
      await onReloadPdf(entry.pdfBytes)
    }
  }

  const [showRotateMenu, setShowRotateMenu] = useState(false)
  const [showCompressMenu, setShowCompressMenu] = useState(false)
  const [showResizeMenu, setShowResizeMenu] = useState(false)

  const handleResize = async (sizeKey: string) => {
    setShowResizeMenu(false)
    if (selectedPages.size === 0) return
    const { resizePages } = await import('@/lib/page-operations')
    const pages = Array.from(selectedPages).sort((a, b) => a - b)
    executeOp(
      () => resizePages(pdfBytes!, { ...annotations }, pages, sizeKey as import('@/lib/page-operations').PageSizeKey),
      'ページサイズを変更中...'
    )
  }

  const handleExportPdf = async () => {
    if (!pdfBytes) return
    const { exportFlattenedPdf, downloadBlob: dlBlob } = await import('@/lib/export-engine')
    store.setLoading(true, 'マスク済みPDFを生成中...')
    try {
      const doc = await window.pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise
      const result = await exportFlattenedPdf(doc, store.annotations, (current, total) => {
        store.setLoading(true, `フラット化中... ${current} / ${total} ページ`)
      })
      const fileName = store.projectName ? `${store.projectName}_edited.pdf` : 'edited_output.pdf'
      dlBlob(result, fileName, 'application/pdf')
    } catch (err) {
      showToast('PDF出力に失敗しました: ' + (err as Error).message, 'error')
    } finally {
      store.setLoading(false)
    }
  }

  const handleCompress = async (level: 'high' | 'standard' | 'light') => {
    setShowCompressMenu(false)
    if (!pdfBytes) return
    const { compressPdf, downloadBlob: dlBlob } = await import('@/lib/export-engine')
    store.setLoading(true, 'PDFを圧縮中...')
    try {
      const doc = await window.pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise
      const originalSize = pdfBytes.length
      const result = await compressPdf(doc, level, (current, total) => {
        store.setLoading(true, `圧縮中... ${current} / ${total} ページ`)
      })
      const ratio = Math.round((1 - result.length / originalSize) * 100)
      const sizeStr = (sz: number) => sz > 1048576 ? (sz / 1048576).toFixed(1) + ' MB' : Math.round(sz / 1024) + ' KB'
      store.setLoading(false)
      showToast(`圧縮完了！ ${sizeStr(originalSize)} → ${sizeStr(result.length)}（${ratio}%削減）`, 'success')
      const fileName = store.projectName ? `${store.projectName}_compressed.pdf` : 'compressed.pdf'
      dlBlob(result, fileName, 'application/pdf')
    } catch (err) {
      showToast('圧縮に失敗しました: ' + (err as Error).message, 'error')
    } finally {
      store.setLoading(false)
    }
  }

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
          ファイル追加
        </button>
        <input ref={importInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={handleImport} />

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
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">90° 右</button>
              <button onClick={() => { handleRotate(180); setShowRotateMenu(false) }}
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">180°</button>
              <button onClick={() => { handleRotate(270); setShowRotateMenu(false) }}
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">90° 左</button>
            </div>
          )}
        </div>

        {/* Resize dropdown */}
        <div className="relative">
          <button onClick={() => setShowResizeMenu(!showResizeMenu)} disabled={selectedPages.size === 0}
            className="px-3 py-1.5 text-sm sm:text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
            サイズ ▾
          </button>
          {showResizeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
              {Object.entries(
                // dynamic import workaround: inline the sizes
                {
                  'A4': 'A4 (210×297mm)',
                  'A4横': 'A4 横',
                  'A3': 'A3 (297×420mm)',
                  'A3横': 'A3 横',
                  'B4': 'B4 (257×364mm)',
                  'B5': 'B5 (182×257mm)',
                }
              ).map(([key, label]) => (
                <button key={key} onClick={() => handleResize(key)}
                  className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">{label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200" />

        <button onClick={handleUndo} disabled={store.pageUndoStack.length === 0}
          className="px-3 py-1.5 text-sm sm:text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
          ↩ 元に戻す
        </button>

        <div className="w-px h-5 bg-gray-200" />

        {/* Export & Compress */}
        <button onClick={handleExportPdf}
          className="px-3 py-1.5 text-sm sm:text-xs border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 font-semibold">
          PDFダウンロード
        </button>
        <div className="relative">
          <button onClick={() => setShowCompressMenu(!showCompressMenu)}
            className="px-3 py-1.5 text-sm sm:text-xs border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50">
            圧縮 ▾
          </button>
          {showCompressMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
              <button onClick={() => handleCompress('light')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">軽量圧縮</button>
              <button onClick={() => handleCompress('standard')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">標準圧縮</button>
              <button onClick={() => handleCompress('high')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">最大圧縮</button>
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
                ref={(el) => { if (el) thumbRefs.current.set(pageNum, el); else thumbRefs.current.delete(pageNum) }}
                data-page={pageNum}
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
