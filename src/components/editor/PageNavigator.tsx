'use client'

import { useEditorStore } from '@/hooks/useEditorStore'
interface PageNavigatorProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy
}

// Labels describe what the NEXT click will switch to
const NEXT_FIT_LABELS = ['横フィット', '100%', '縦フィット']

export default function PageNavigator({ pdfDoc }: PageNavigatorProps) {
  const {
    currentPage, totalPages, scale, fitMode,
    setCurrentPage, setScale, setFitMode,
    currentTool, selectedAnnotationId, annotations,
  } = useEditorStore()

  // Hint text based on current state
  const hintText = (() => {
    if (currentTool === 'select') {
      if (selectedAnnotationId) {
        const pageAnns = annotations[currentPage] || []
        const ann = pageAnns.find((a) => a.id === selectedAnnotationId)
        if (ann?.type === 'callout') return 'ダブルクリックで編集 / 黄◆で矢印移動'
        return 'ダブルクリックで再編集'
      }
      return 'クリックで選択'
    }
    if (currentTool === 'polyline') return 'クリックで頂点追加 / ダブルクリックで確定 / DELで戻る'
    if (currentTool === 'text') return 'クリックでテキスト入力'
    if (currentTool === 'callout') return 'ドラッグでテキスト配置 → 矢印方向に引く'
    return null
  })()

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.25, 4))
  }

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5))
  }

  const handleCycleFit = async () => {
    const nextMode = (fitMode + 1) % 3
    setFitMode(nextMode)

    const page = await pdfDoc.getPage(currentPage)
    const viewport = page.getViewport({ scale: 1 })
    const maxW = window.innerWidth - 60
    const maxH = window.innerHeight - 220

    if (nextMode === 0) {
      setScale(Math.min(maxH / viewport.height, 4))
    } else if (nextMode === 1) {
      setScale(Math.min(maxW / viewport.width, 4))
    } else {
      setScale(1.0)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center gap-2 sm:gap-3 text-sm relative">
      <button
        onClick={handlePrev}
        disabled={currentPage <= 1}
        className="px-2 sm:px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ◀
      </button>
      <span className="text-xs sm:text-sm">
        <span className="font-semibold">{currentPage}</span> / {totalPages}
        <span className="hidden sm:inline"> ページ</span>
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="px-2 sm:px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ▶
      </button>

      <div className="flex items-center gap-1 sm:gap-1.5 ml-2 sm:ml-5">
        <button
          onClick={handleZoomOut}
          className="px-1.5 sm:px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          −
        </button>
        <span className="min-w-[36px] sm:min-w-[45px] text-center text-xs text-gray-400">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="px-1.5 sm:px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={handleCycleFit}
          className="px-1.5 sm:px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50 text-xs"
        >
          {NEXT_FIT_LABELS[fitMode]}
        </button>
      </div>

      {/* Hint text - right side */}
      {hintText && (
        <span className="hidden sm:block absolute right-4 text-[11px] text-gray-400">
          {hintText}
        </span>
      )}
    </div>
  )
}
