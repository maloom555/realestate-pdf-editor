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
  } = useEditorStore()

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
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <button
        onClick={handlePrev}
        disabled={currentPage <= 1}
        className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ◀
      </button>
      <span>
        <span className="font-semibold">{currentPage}</span> / {totalPages} ページ
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ▶
      </button>

      <div className="flex items-center gap-1.5 ml-5">
        <button
          onClick={handleZoomOut}
          className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          −
        </button>
        <span className="min-w-[45px] text-center text-xs text-gray-400">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={handleCycleFit}
          className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50 text-xs"
        >
          {NEXT_FIT_LABELS[fitMode]}
        </button>
      </div>
    </div>
  )
}
