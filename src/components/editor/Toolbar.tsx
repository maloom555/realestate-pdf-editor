'use client'

import { useEditorStore } from '@/hooks/useEditorStore'
import type { ToolType, StampData } from '@/types/annotations'
import { STAMP_PRESETS } from '@/components/stamps/stamps-data'
import { useState, useRef, useEffect } from 'react'
import SignatureEditor from './SignatureEditor'
import { TEXT_TEMPLATES } from '@/lib/text-templates'
import { emit } from '@/lib/event-bus'
import { showToast } from '@/components/ui/Toast'

const tools: { id: ToolType; label: string; icon: string }[] = [
  { id: 'rect', label: '墨消し', icon: '■' },
  { id: 'circle', label: '円', icon: '○' },
  { id: 'shape-rect', label: '四角', icon: '□' },
  { id: 'pen', label: '自由線', icon: '〰' },
  { id: 'polyline', label: '折線', icon: '📐' },
  { id: 'arrow', label: '矢印', icon: '→' },
  { id: 'highlight', label: 'ハイライト', icon: '🖍' },
  { id: 'text', label: 'テキスト', icon: 'A' },
  { id: 'callout', label: '矢印テキスト', icon: '💬' },
  { id: 'stamp', label: 'スタンプ', icon: '印' },
  { id: 'select', label: '選択', icon: '↖' },
]

const COLOR_PALETTE = [
  '#000000', '#333333', '#666666', '#999999',
  '#dc2626', '#ea580c', '#d97706', '#059669',
  '#1d4ed8', '#6366f1', '#9333ea', '#db2777',
  '#ffffff', '#facc15', '#84cc16', '#06b6d4',
]

const FONT_FAMILIES = [
  { value: 'Noto Sans JP', label: 'Noto Sans JP' },
  { value: 'Yu Gothic', label: '游ゴシック' },
  { value: 'Meiryo', label: 'メイリオ' },
  { value: 'MS Gothic', label: 'MSゴシック' },
  { value: 'Arial', label: 'Arial' },
]

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

interface ToolbarProps {
  pdfDoc?: pdfjsLib.PDFDocumentProxy
}

const NEXT_FIT_LABELS = ['横フィット', '100%', '縦フィット']

export default function Toolbar({ pdfDoc }: ToolbarProps = {}) {
  const store = useEditorStore()
  const {
    currentTool, maskColor, penSize, fontSize, fontFamily, highlightOpacity, elementOpacity,
    fillEnabled, fillOpacity, textBold, textUnderline, textBox,
    selectedAnnotationId, annotations, currentPage, pdfBytes,
    totalPages, scale, fitMode, setCurrentPage, setScale, setFitMode,
    setCurrentTool, setMaskColor, setPenSize, setFontSize, setFontFamily, setHighlightOpacity,
    setElementOpacity, setFillEnabled, setFillOpacity,
    setTextBold, setTextUnderline, setTextBox,
    removeAnnotation, updateAnnotation, undo, redo, clearPage, undoStack, redoStack,
    copyAnnotation, pasteAnnotation, clipboardAnnotation, duplicateAnnotation,
    bringForward, sendBackward,
  } = store

  // Hint text - shown in sub-menu area
  const hintText = (() => {
    if (currentTool === 'select') {
      if (selectedAnnotationId) {
        const pageAnns = annotations[currentPage] || []
        const ann = pageAnns.find((a) => a.id === selectedAnnotationId)
        if (ann?.type === 'callout') return 'ダブルクリックで編集 / 黄◆で矢印移動'
        if (ann?.type === 'text') return 'ダブルクリックで再編集'
        return null
      }
      return null
    }
    if (currentTool === 'polyline') return 'クリックで頂点追加 / ダブルクリックで確定 / DELで戻る'
    if (currentTool === 'text') return 'クリックでテキスト入力'
    if (currentTool === 'callout') return 'ドラッグでテキスト配置 → 矢印方向に引く'
    return null
  })()

  // Page navigator handlers (merged from PageNavigator)
  const handlePrev = () => { if (currentPage > 1) setCurrentPage(currentPage - 1) }
  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1) }
  const handleZoomIn = () => setScale(Math.min(scale + 0.25, 4))
  const handleZoomOut = () => setScale(Math.max(scale - 0.25, 0.5))
  const handleCycleFit = async () => {
    if (!pdfDoc) return
    const nextMode = (fitMode + 1) % 3
    setFitMode(nextMode)
    const page = await pdfDoc.getPage(currentPage)
    const viewport = page.getViewport({ scale: 1 })
    const maxW = window.innerWidth - 60
    const maxH = window.innerHeight - 220
    if (nextMode === 0) setScale(Math.min(maxH / viewport.height, 4))
    else if (nextMode === 1) setScale(Math.min(maxW / viewport.width, 4))
    else setScale(1.0)
  }

  const [showStampPicker, setShowStampPicker] = useState(false)
  const [showSignatureEditor, setShowSignatureEditor] = useState(false)
  const [showTextTemplates, setShowTextTemplates] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [signatureTemplates, setSignatureTemplates] = useState<import('@/types/annotations').SignatureTemplate[]>([])
  const loadProjectInputRef = useRef<HTMLInputElement>(null)

  // Load signature templates when stamp picker opens
  useEffect(() => {
    if (showStampPicker) {
      import('@/lib/signature-db').then(({ getAllSignatureTemplates }) =>
        getAllSignatureTemplates().then(setSignatureTemplates)
      )
    }
  }, [showStampPicker])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleToolSelect = (tool: ToolType) => {
    if (tool === 'stamp') {
      setShowStampPicker(!showStampPicker)
      setCurrentTool('stamp')
    } else {
      setShowStampPicker(false)
      setCurrentTool(tool)
    }
  }

  const handleStampSelect = (stampId: string, label: string, color: string) => {
    emit('place-stamp', { stampId, label, color })
    setShowStampPicker(false)
    setShowSignatureEditor(false)
  }

  const handleSignaturePlace = (text: string, color: string, fontSize: number, fontFamily: string, imageData?: string, imagePosition?: 'top' | 'left' | 'right', imageScale?: number, showBorder?: boolean) => {
    emit('place-signature', { text, color, fontSize, fontFamily, imageData, imagePosition, imageScale, showBorder })
    setShowSignatureEditor(false)
    setShowStampPicker(false)
  }

  const handleQuickPlaceSignature = (tmpl: import('@/types/annotations').SignatureTemplate) => {
    import('@/lib/signature-db').then(({ applyVariables }) => {
      const text = applyVariables(tmpl.template, tmpl.variables)
      handleSignaturePlace(text, tmpl.color, tmpl.fontSize, tmpl.fontFamily, tmpl.imageData, tmpl.imagePosition, tmpl.imageScale, tmpl.showBorder)
    })
  }

  const handleInsertTemplate = (text: string) => {
    setCurrentTool('text')
    setShowTextTemplates(false)
    emit('insert-template-text', text)
  }

  const handleDelete = () => {
    if (selectedAnnotationId) {
      removeAnnotation(currentPage, selectedAnnotationId)
    }
  }

  const handleExport = async (pageNumbers: 'none' | 'bottom-center' | 'bottom-right' | 'bottom-left' = 'none') => {
    setShowExportMenu(false)
    const { exportFlattenedPdf, downloadBlob } = await import('@/lib/export-engine')
    if (!pdfBytes) return

    store.setLoading(true, 'マスク済みPDFを生成中...')
    try {
      const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise
      const result = await exportFlattenedPdf(
        pdfDoc,
        store.annotations,
        (current, total) => {
          store.setLoading(true, `フラット化中... ${current} / ${total} ページ`)
        },
        undefined,
        pageNumbers
      )
      const fileName = store.projectName ? `${store.projectName}_edited.pdf` : 'edited_output.pdf'
      downloadBlob(result, fileName, 'application/pdf')
    } catch (err) {
      showToast('PDF出力に失敗しました: ' + (err as Error).message, 'error')
    } finally {
      store.setLoading(false)
    }
  }

  const [showCompressMenu, setShowCompressMenu] = useState(false)

  const handleCompress = async (level: 'high' | 'standard' | 'light') => {
    setShowCompressMenu(false)
    if (!pdfBytes) return
    const { compressPdf, downloadBlob } = await import('@/lib/export-engine')

    store.setLoading(true, 'PDFを圧縮中...')
    try {
      const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise
      const originalSize = pdfBytes.length
      const result = await compressPdf(pdfDoc, level, (current, total) => {
        store.setLoading(true, `圧縮中... ${current} / ${total} ページ`)
      }, pdfBytes)
      const sizeStr = (sz: number) => sz > 1048576 ? (sz / 1048576).toFixed(1) + ' MB' : Math.round(sz / 1024) + ' KB'
      store.setLoading(false)

      // If compressed is larger than original, use original
      if (result.length >= originalSize) {
        showToast(`このPDFは既に十分小さいため圧縮できません（${sizeStr(originalSize)}）`, 'info')
        return
      }

      const ratio = Math.round((1 - result.length / originalSize) * 100)
      showToast(`圧縮完了！ ${sizeStr(originalSize)} → ${sizeStr(result.length)}（${ratio}%削減）`, 'success')
      const fileName = store.projectName ? `${store.projectName}_compressed.pdf` : 'compressed.pdf'
      downloadBlob(result, fileName, 'application/pdf')
    } catch (err) {
      showToast('圧縮に失敗しました: ' + (err as Error).message, 'error')
    } finally {
      store.setLoading(false)
    }
  }

  const handleSaveProject = () => {
    if (!pdfBytes) return
    const base64 = uint8ArrayToBase64(pdfBytes)
    const data = {
      version: 1,
      pdfBase64: base64,
      annotations: store.annotations,
      currentPage: store.currentPage,
      totalPages: store.totalPages,
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = store.projectName ? `${store.projectName}.rpef` : 'project.rpef'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      emit('load-project', text)
    } catch (err) {
      showToast('プロジェクト読み込みに失敗しました: ' + (err as Error).message, 'error')
    }
  }

  // Selected annotation
  const selectedAnn = selectedAnnotationId
    ? (annotations[currentPage] || []).find((a) => a.id === selectedAnnotationId)
    : null

  // Tool-based conditions
  const showPenSize = ['pen', 'arrow', 'polyline', 'circle', 'shape-rect'].includes(currentTool)
  const showFontOptions = currentTool === 'text' || currentTool === 'callout'
  const showColorPicker = currentTool !== 'select'
  const showSubMenu = currentTool !== 'select' || !!selectedAnn

  // Selected annotation conditions
  const canAdjustSize = selectedAnn && ['circle', 'shape-rect', 'arrow', 'polyline', 'pen'].includes(selectedAnn.type)
  const isPolyline = selectedAnn && (selectedAnn.type === 'polyline' || selectedAnn.type === 'pen')
  const canChangeColor = !!selectedAnn
  const isSelectedText = selectedAnn?.type === 'text'
  const isSelectedCallout = selectedAnn?.type === 'callout'
  const isSelectedStamp = selectedAnn?.type === 'stamp'

  // Fill-applicable types
  const fillToolTypes = ['circle', 'shape-rect', 'pen', 'polyline']
  const showFillForTool = fillToolTypes.includes(currentTool)
  const showFillForSelected = selectedAnn && fillToolTypes.includes(selectedAnn.type)
  // Close-applicable types (pen/polyline)
  const showCloseForSelected = selectedAnn && ['pen', 'polyline'].includes(selectedAnn.type)
  // Dash-applicable types
  const dashToolTypes = ['pen', 'circle', 'shape-rect', 'polyline']
  const showDashForTool = dashToolTypes.includes(currentTool)
  const showDashForSelected = selectedAnn && dashToolTypes.includes(selectedAnn.type)
  // Border-radius applicable types
  const radiusTypes = ['shape-rect']
  const showRadiusForTool = radiusTypes.includes(currentTool)
  const showRadiusForSelected = selectedAnn && (radiusTypes.includes(selectedAnn.type) || (selectedAnn.type === 'text' && (selectedAnn.data as { textBox?: boolean }).textBox))

  // Handle color change
  const handleColorChange = (color: string) => {
    if (currentTool === 'select' && selectedAnn) {
      updateAnnotation(currentPage, selectedAnn.id, { color })
    }
    setMaskColor(color)
  }

  // Handle font family change
  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family)
    if ((isSelectedText || isSelectedCallout) && selectedAnn) {
      updateAnnotation(currentPage, selectedAnn.id, {
        data: { ...selectedAnn.data, fontFamily: family } as never,
      })
    }
  }

  // Handle font size change for selected text
  const handleSelectedFontSizeChange = (size: number) => {
    setFontSize(size)
    if ((isSelectedText || isSelectedCallout) && selectedAnn) {
      updateAnnotation(currentPage, selectedAnn.id, {
        data: { ...selectedAnn.data, fontSize: size } as never,
      })
    }
  }

  // Handle opacity change
  const handleOpacityChange = (val: number) => {
    const opacity = val / 100
    if (currentTool === 'select' && selectedAnn) {
      updateAnnotation(currentPage, selectedAnn.id, { opacity })
    } else if (currentTool === 'highlight') {
      setHighlightOpacity(opacity)
    } else {
      setElementOpacity(opacity)
    }
  }

  // Handle fill toggle
  const handleFillToggle = () => {
    if (currentTool === 'select' && selectedAnn) {
      updateAnnotation(currentPage, selectedAnn.id, { fillEnabled: !selectedAnn.fillEnabled })
    } else {
      setFillEnabled(!fillEnabled)
    }
  }

  // Handle fill opacity change
  const handleFillOpacityChange = (val: number) => {
    const fo = val / 100
    if (currentTool === 'select' && selectedAnn) {
      updateAnnotation(currentPage, selectedAnn.id, { fillOpacity: fo })
    } else {
      setFillOpacity(fo)
    }
  }

  // Handle close toggle
  const handleCloseToggle = () => {
    if (selectedAnn) {
      const newClosed = !selectedAnn.closed
      // Auto-enable fill when closing a path
      if (newClosed && !selectedAnn.fillEnabled) {
        updateAnnotation(currentPage, selectedAnn.id, { closed: newClosed, fillEnabled: true })
      } else {
        updateAnnotation(currentPage, selectedAnn.id, { closed: newClosed })
      }
    }
  }

  // Group stamps by category
  const stampsByCategory = STAMP_PRESETS.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, typeof STAMP_PRESETS>)

  // Display values
  const displayFontSize = (isSelectedText || isSelectedCallout) && selectedAnn
    ? ((selectedAnn.data as { fontSize?: number }).fontSize || fontSize)
    : fontSize
  const displayFontFamily = (isSelectedText || isSelectedCallout) && selectedAnn
    ? ((selectedAnn.data as { fontFamily?: string }).fontFamily || fontFamily)
    : fontFamily
  const displayBold = (isSelectedText || isSelectedCallout) && selectedAnn
    ? ((selectedAnn.data as { bold?: boolean }).bold ?? false)
    : textBold
  const displayUnderline = (isSelectedText || isSelectedCallout) && selectedAnn
    ? ((selectedAnn.data as { underline?: boolean }).underline ?? false)
    : textUnderline
  const displayTextBox = isSelectedText && selectedAnn
    ? ((selectedAnn.data as { textBox?: boolean }).textBox ?? false)
    : textBox

  // Opacity display
  const displayOpacity = selectedAnn
    ? Math.round((selectedAnn.opacity ?? 1) * 100)
    : currentTool === 'highlight'
      ? Math.round(highlightOpacity * 100)
      : Math.round(elementOpacity * 100)

  // Fill display
  const displayFillEnabled = selectedAnn ? (selectedAnn.fillEnabled ?? false) : fillEnabled
  const displayFillOpacity = selectedAnn
    ? Math.round((selectedAnn.fillOpacity ?? 0.3) * 100)
    : Math.round(fillOpacity * 100)

  // Sub-menu content (shared between desktop and mobile)
  const subMenuContent = () => (
    <>
      {/* Color palette */}
      {(showColorPicker || canChangeColor) && (
        <div className="flex items-center gap-1.5">
          <label className="text-sm sm:text-xs text-gray-400 font-semibold shrink-0">色:</label>
          <div className="flex items-center gap-0.5 flex-wrap">
            {COLOR_PALETTE.map((c) => (
              <button key={c} onClick={() => handleColorChange(c)}
                className={`w-6 h-6 sm:w-5 sm:h-5 rounded-sm border-2 transition-all ${
                  (canChangeColor ? selectedAnn.color : maskColor) === c
                    ? 'border-indigo-500 scale-125' : 'border-gray-300 hover:border-indigo-400'
                }`}
                style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
          <input type="color" value={canChangeColor ? selectedAnn.color : maskColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer p-0 shrink-0" title="カスタムカラー" />
        </div>
      )}

      {/* Pen size (1-20) */}
      {(showPenSize || canAdjustSize) && (
        <>
          <div className="w-px h-5 bg-gray-300 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <label className="text-sm sm:text-xs text-gray-400 font-semibold shrink-0">太さ:</label>
            <input type="range" min={1} max={20}
              value={canAdjustSize ? (selectedAnn.size || 2) : penSize}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (canAdjustSize) updateAnnotation(currentPage, selectedAnn.id, { size: v })
                else setPenSize(v)
              }}
              className="w-20 accent-indigo-500" />
            <span className="text-sm sm:text-xs text-gray-400 min-w-[30px]">
              {canAdjustSize ? (selectedAnn.size || 2) : penSize}px
            </span>
          </div>
        </>
      )}

      {/* Font options */}
      {(showFontOptions || isSelectedText || isSelectedCallout) && (
        <>
          <div className="w-px h-5 bg-gray-300 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <label className="text-sm sm:text-xs text-gray-400 font-semibold shrink-0">文字:</label>
            <input type="range" min={1} max={100} value={displayFontSize}
              onChange={(e) => handleSelectedFontSizeChange(parseInt(e.target.value))}
              className="w-20 accent-indigo-500" />
            <span className="text-sm sm:text-xs text-gray-400 min-w-[30px]">{displayFontSize}px</span>
          </div>
          {(currentTool === 'text' || currentTool === 'callout' || isSelectedText || isSelectedCallout) && (
            <select value={displayFontFamily} onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="text-sm sm:text-xs border border-gray-200 rounded px-2 py-1 sm:px-1 sm:py-0.5 bg-white text-gray-700">
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => {
              const newVal = !displayBold
              setTextBold(newVal)
              if ((isSelectedText || isSelectedCallout) && selectedAnn) {
                updateAnnotation(currentPage, selectedAnn.id, {
                  data: { ...selectedAnn.data, bold: newVal } as never,
                })
              }
            }}
              className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs font-bold border rounded-lg ${
                displayBold ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'
              }`}>B</button>
            <button onClick={() => {
              const newVal = !displayUnderline
              setTextUnderline(newVal)
              if ((isSelectedText || isSelectedCallout) && selectedAnn) {
                updateAnnotation(currentPage, selectedAnn.id, {
                  data: { ...selectedAnn.data, underline: newVal } as never,
                })
              }
            }}
              className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs underline border rounded-lg ${
                displayUnderline ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'
              }`}>U</button>
            {(currentTool === 'text' || isSelectedText) && (
              <button onClick={() => {
                const newVal = !displayTextBox
                setTextBox(newVal)
                if (isSelectedText && selectedAnn) {
                  updateAnnotation(currentPage, selectedAnn.id, {
                    data: { ...selectedAnn.data, textBox: newVal } as never,
                  })
                }
              }}
                className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border rounded-lg ${
                  displayTextBox ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'
                }`} title="テキストボックス">枠</button>
            )}
          </div>
          {/* Text template button */}
          {currentTool === 'text' && !isSelectedText && (
            <div className="relative">
              <button onClick={() => setShowTextTemplates(!showTextTemplates)}
                className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border rounded-lg ${
                  showTextTemplates ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>定型文</button>
              {showTextTemplates && (
                <div className={`absolute ${isMobile ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-72 max-h-80 overflow-auto`}>
                  {Array.from(new Set(TEXT_TEMPLATES.map(t => t.category))).map((cat) => (
                    <div key={cat}>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 sticky top-0">{cat}</div>
                      {TEXT_TEMPLATES.filter(t => t.category === cat).map((tmpl) => (
                        <button key={tmpl.id} onClick={() => handleInsertTemplate(tmpl.text)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b border-gray-50 transition-colors">
                          <span className="font-medium text-gray-700">{tmpl.label}</span>
                          <span className="block text-[10px] text-gray-400 mt-0.5 truncate">{tmpl.text}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Callout arrow size */}
      {(currentTool === 'callout' || isSelectedCallout) && (
        <div className="flex items-center gap-1.5">
          <label className="text-sm sm:text-xs text-gray-400 font-semibold shrink-0">矢印:</label>
          <input type="range" min={1} max={10} value={
            isSelectedCallout && selectedAnn
              ? ((selectedAnn.data as { arrowSize?: number }).arrowSize || 2)
              : penSize
          }
            onChange={(e) => {
              const v = parseInt(e.target.value)
              setPenSize(v)
              if (isSelectedCallout && selectedAnn) {
                updateAnnotation(currentPage, selectedAnn.id, {
                  data: { ...selectedAnn.data, arrowSize: v } as never,
                })
              }
            }}
            className="w-16 accent-indigo-500" />
          <span className="text-sm sm:text-xs text-gray-400 min-w-[24px]">{
            isSelectedCallout && selectedAnn
              ? ((selectedAnn.data as { arrowSize?: number }).arrowSize || 2)
              : penSize
          }px</span>
        </div>
      )}

      {/* Opacity */}
      <div className="flex items-center gap-1.5">
        <label className="text-sm sm:text-xs text-gray-400 font-semibold shrink-0">透過:</label>
        <input type="range" min={5} max={100} value={displayOpacity}
          onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
          className="w-16 accent-indigo-500" />
        <span className="text-sm sm:text-xs text-gray-400 min-w-[30px]">{displayOpacity}%</span>
      </div>

      {/* Fill controls */}
      {(showFillForTool || showFillForSelected) && (
        <>
          <button onClick={handleFillToggle}
            className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border rounded-lg ${
              displayFillEnabled ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'
            }`}>塗り</button>
          {displayFillEnabled && (
            <div className="flex items-center gap-1">
              <label className="text-sm sm:text-xs text-gray-400">濃さ:</label>
              <input type="range" min={5} max={100} value={displayFillOpacity}
                onChange={(e) => handleFillOpacityChange(parseInt(e.target.value))}
                className="w-14 accent-indigo-500" />
              <span className="text-sm sm:text-xs text-gray-400 min-w-[24px]">{displayFillOpacity}%</span>
            </div>
          )}
        </>
      )}

      {/* Close path toggle */}
      {showCloseForSelected && (
        <button onClick={handleCloseToggle}
          className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border rounded-lg ${
            selectedAnn.closed ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'
          }`}>閉じる</button>
      )}

      {/* Arrow toggles (polyline + pen) */}
      {isPolyline && (
        <>
          <button onClick={() => {
            if (selectedAnn.type === 'polyline') {
              const d = selectedAnn.data as { arrowStart: boolean; arrowEnd: boolean }
              updateAnnotation(currentPage, selectedAnn.id, {
                data: { ...selectedAnn.data, arrowStart: !d.arrowStart } as unknown as typeof selectedAnn.data,
              })
            } else {
              updateAnnotation(currentPage, selectedAnn.id, { arrowStart: !selectedAnn.arrowStart })
            }
          }}
            className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border rounded-lg ${
              (selectedAnn.type === 'polyline'
                ? (selectedAnn.data as { arrowStart: boolean }).arrowStart
                : selectedAnn.arrowStart)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-500'
            }`}>←始点</button>
          <button onClick={() => {
            if (selectedAnn.type === 'polyline') {
              const d = selectedAnn.data as { arrowStart: boolean; arrowEnd: boolean }
              updateAnnotation(currentPage, selectedAnn.id, {
                data: { ...selectedAnn.data, arrowEnd: !d.arrowEnd } as unknown as typeof selectedAnn.data,
              })
            } else {
              updateAnnotation(currentPage, selectedAnn.id, { arrowEnd: !selectedAnn.arrowEnd })
            }
          }}
            className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border rounded-lg ${
              (selectedAnn.type === 'polyline'
                ? (selectedAnn.data as { arrowEnd: boolean }).arrowEnd
                : selectedAnn.arrowEnd)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-500'
            }`}>終点→</button>
        </>
      )}

      {/* Dash style dropdown */}
      {(showDashForTool || showDashForSelected) && (
        <div className="flex items-center gap-1">
          <label className="text-sm sm:text-xs text-gray-400 font-semibold shrink-0">線種:</label>
          <select
            value={selectedAnn?.dashStyle || 'solid'}
            onChange={(e) => {
              if (selectedAnn) {
                updateAnnotation(currentPage, selectedAnn.id, { dashStyle: e.target.value as 'solid' | 'dash' | 'dot' | 'dashdot' })
              }
            }}
            className="text-sm sm:text-xs border border-gray-200 rounded px-2 py-1 sm:px-1.5 sm:py-0.5 bg-white text-gray-700"
          >
            <option value="solid">── 実線</option>
            <option value="dash">╌╌ 破線</option>
            <option value="dot">··· 点線</option>
            <option value="dashdot">╌· 一点鎖線</option>
          </select>
        </div>
      )}

      {/* Border radius */}
      {(showRadiusForTool || showRadiusForSelected) && (
        <div className="flex items-center gap-1.5">
          <label className="text-sm sm:text-xs text-gray-400 font-semibold shrink-0">角丸:</label>
          <input type="range" min={0} max={30} value={selectedAnn?.borderRadius || 0}
            onChange={(e) => {
              if (selectedAnn) {
                updateAnnotation(currentPage, selectedAnn.id, { borderRadius: parseInt(e.target.value) })
              }
            }}
            className="w-16 accent-indigo-500" />
          <span className="text-sm sm:text-xs text-gray-400 min-w-[24px]">{selectedAnn?.borderRadius || 0}</span>
        </div>
      )}

      {/* Stamp leg toggle */}
      {isSelectedStamp && (
        <button onClick={() => {
          const sd = selectedAnn.data as StampData
          if (sd.legX != null) {
            updateAnnotation(currentPage, selectedAnn.id, {
              data: { ...selectedAnn.data, legX: undefined, legY: undefined } as unknown as typeof selectedAnn.data,
            })
          } else {
            emit('stamp-leg-mode')
          }
        }}
          className={`px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border rounded-lg ${
            (selectedAnn.data as StampData).legX != null
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-500'
          }`}>
          {(selectedAnn.data as StampData).legX != null ? '引出線✓' : '引出線'}
        </button>
      )}

      {/* Signature stamp edit button */}
      {isSelectedStamp && (selectedAnn.data as StampData).isSignature && (
        <button onClick={() => {
          const sd = selectedAnn.data as StampData
          // Open inline text edit for signature multiLineText
          emit('edit-signature-text', { id: selectedAnn.id, text: sd.multiLineText || '' })
        }}
          className="px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50">
          ✏️ テキスト編集
        </button>
      )}

      {/* Select tool: layer order & delete */}
      {currentTool === 'select' && selectedAnnotationId && (
        <>
          <button onClick={() => bringForward(currentPage, selectedAnnotationId)}
            className="px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            title="最前面へ">↑ 前面</button>
          <button onClick={() => sendBackward(currentPage, selectedAnnotationId)}
            className="px-2.5 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            title="最背面へ">↓ 背面</button>
          <button onClick={handleDelete}
            className="px-3 py-1.5 text-sm sm:text-xs border border-red-300 text-red-500 rounded-lg hover:bg-red-50">削除</button>
        </>
      )}
    </>
  )

  // ===== MOBILE LAYOUT =====
  if (isMobile) {
    return (
      <div className="bg-white border-b border-gray-200 shadow-sm">
        {/* Main tool row */}
        <div className="flex items-center gap-1.5 px-2 py-2">
          {/* Scrollable tool buttons */}
          <div className="flex-1 overflow-x-auto flex items-center gap-1.5 min-w-0">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-lg transition-all
                  ${currentTool === tool.id
                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                    : 'text-gray-500 active:bg-gray-100'
                  }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0 border-l border-gray-200 pl-1.5">
            <button onClick={duplicateAnnotation} disabled={!selectedAnnotationId}
              className="w-9 h-9 flex items-center justify-center text-sm text-gray-500 disabled:opacity-30 rounded active:bg-gray-100"
              title="複製 (Ctrl+C)">📋</button>
            <button onClick={() => {
                emit('paste-clipboard-image')
              }}
              className="w-9 h-9 flex items-center justify-center text-sm text-gray-500 rounded active:bg-gray-100"
              title="貼付け">📎</button>
            <button onClick={undo} disabled={undoStack.length === 0}
              className="w-9 h-9 flex items-center justify-center text-lg text-gray-500 disabled:opacity-30 rounded active:bg-gray-100"
              title="戻す">↩</button>
            <button onClick={redo} disabled={redoStack.length === 0}
              className="w-9 h-9 flex items-center justify-center text-lg text-gray-500 disabled:opacity-30 rounded active:bg-gray-100"
              title="やり直し">↪</button>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`w-9 h-9 flex items-center justify-center text-lg rounded ${showMobileMenu ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 active:bg-gray-100'}`}
              title="メニュー">⋯</button>
          </div>
        </div>

        {/* More menu (mobile) */}
        {showMobileMenu && (
          <div className="px-3 py-2 border-t border-gray-100 bg-white flex items-center gap-2 flex-wrap">
            <button onClick={handleSaveProject} disabled={!pdfBytes}
              className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg disabled:opacity-30">💾 保存</button>
            <button onClick={() => { loadProjectInputRef.current?.click(); setShowMobileMenu(false) }}
              className="px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg">📂 読込</button>
            <input ref={loadProjectInputRef} type="file" accept=".rpef,.json" className="hidden" onChange={handleLoadProject} />
            <button onClick={() => clearPage(currentPage)}
              className="px-3 py-2 text-sm border border-gray-200 text-gray-500 rounded-lg">クリア</button>
            <button onClick={() => handleExport('none')}
              className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg font-semibold">PDFダウンロード</button>
            <button onClick={() => handleExport('bottom-center')}
              className="px-3 py-2 text-sm border border-indigo-300 text-indigo-600 rounded-lg">+頁番号</button>
            <div className="relative">
              <button onClick={() => setShowCompressMenu(!showCompressMenu)}
                className="px-3 py-2 text-sm border border-orange-300 text-orange-600 rounded-lg">圧縮 ▾</button>
              {showCompressMenu && (
                <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                  <button onClick={() => handleCompress('light')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">軽量圧縮（高品質）</button>
                  <button onClick={() => handleCompress('standard')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">標準圧縮</button>
                  <button onClick={() => handleCompress('high')} className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50">最大圧縮（小サイズ）</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sub-menu - fixed at bottom on mobile */}
        {showSubMenu && (
          <div className="fixed bottom-0 left-0 right-0 z-40 px-3 py-2 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex items-center gap-2.5 flex-wrap overflow-x-auto safe-bottom">
            {subMenuContent()}
          </div>
        )}

        {/* Stamp Picker (mobile) */}
        {showStampPicker && !showSignatureEditor && (
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 max-h-44 overflow-y-auto">
            {Object.entries(stampsByCategory).map(([category, stamps]) => (
              <div key={category} className="mb-2">
                <div className="text-sm text-gray-400 font-semibold mb-1">{category}</div>
                <div className="flex flex-wrap gap-1.5">
                  {stamps.map((stamp) => (
                    <button key={stamp.id}
                      onClick={() => handleStampSelect(stamp.id, stamp.label, stamp.color)}
                      className="px-3 py-1.5 text-sm border-2 rounded hover:shadow transition-all font-bold"
                      style={{ borderColor: stamp.color, color: stamp.color }}>
                      {stamp.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {/* Compass stamp */}
            <div className="mb-2">
              <div className="text-sm text-gray-400 font-semibold mb-1">方位</div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => handleStampSelect('compass', '', '#333333')}
                  className="px-3 py-1.5 text-sm border-2 rounded hover:shadow transition-all font-bold border-gray-700 text-gray-700">
                  ◎ 方位マーク
                </button>
              </div>
            </div>
            {/* Signature stamps - quick place */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-400 font-semibold mb-1">署名スタンプ</div>
              <div className="flex flex-wrap gap-1.5">
                {signatureTemplates.map((tmpl) => (
                  <button key={tmpl.id}
                    onClick={() => handleQuickPlaceSignature(tmpl)}
                    className="px-3 py-1.5 text-sm border-2 border-indigo-400 text-indigo-600 rounded hover:shadow hover:bg-indigo-50 transition-all font-bold">
                    {tmpl.name}
                  </button>
                ))}
                <button onClick={() => setShowSignatureEditor(true)}
                  className="px-3 py-1.5 text-sm border-2 border-dashed border-gray-300 text-gray-400 rounded hover:border-indigo-400 hover:text-indigo-500">
                  + 管理
                </button>
              </div>
            </div>
          </div>
        )}
        {showSignatureEditor && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => {
              setShowSignatureEditor(false)
              setShowStampPicker(true)
              import('@/lib/signature-db').then(({ getAllSignatureTemplates }) =>
                getAllSignatureTemplates().then(setSignatureTemplates)
              )
            }} />
            <div className="relative z-20">
              <SignatureEditor onPlace={handleSignaturePlace} onClose={() => {
                setShowSignatureEditor(false)
                setShowStampPicker(true)
                import('@/lib/signature-db').then(({ getAllSignatureTemplates }) =>
                  getAllSignatureTemplates().then(setSignatureTemplates)
                )
              }} />
            </div>
          </>
        )}
      </div>
    )
  }

  // ===== DESKTOP LAYOUT =====
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm relative">
      {/* Main tool bar - compacted for single-row layout */}
      <div className="px-2 py-1.5 flex items-center justify-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`flex items-center gap-1 px-2 py-1 border-2 rounded-lg text-xs transition-all
                ${currentTool === tool.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-500'
                }`}
              title={tool.label}
            >
              <span className="text-base leading-none">{tool.icon}</span>
              <span className="hidden lg:inline">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200" />

        <div className="relative">
          <div className="flex">
            <button onClick={() => handleExport('none')}
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-l-lg font-semibold hover:bg-indigo-700 transition-colors">
              PDFダウンロード
            </button>
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-1.5 py-1 text-xs bg-indigo-700 text-white rounded-r-lg hover:bg-indigo-800 transition-colors border-l border-indigo-500">
              ▾
            </button>
          </div>
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
              <div className="px-3 py-1.5 text-[10px] text-gray-400 font-semibold border-b border-gray-100">ページ番号付きで出力</div>
              <button onClick={() => handleExport('bottom-center')} className="block w-full px-4 py-2 text-xs text-left hover:bg-gray-50">ページ番号（中央下）</button>
              <button onClick={() => handleExport('bottom-right')} className="block w-full px-4 py-2 text-xs text-left hover:bg-gray-50">ページ番号（右下）</button>
              <button onClick={() => handleExport('bottom-left')} className="block w-full px-4 py-2 text-xs text-left hover:bg-gray-50">ページ番号（左下）</button>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setShowCompressMenu(!showCompressMenu)} disabled={!pdfBytes}
            className="px-2 py-1 text-xs border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed"
            title="PDFファイルサイズを圧縮します">
            圧縮 ▾
          </button>
          {showCompressMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[170px]">
              <button onClick={() => handleCompress('light')} className="block w-full px-4 py-2 text-xs text-left hover:bg-gray-50">軽量圧縮（高品質）</button>
              <button onClick={() => handleCompress('standard')} className="block w-full px-4 py-2 text-xs text-left hover:bg-gray-50">標準圧縮</button>
              <button onClick={() => handleCompress('high')} className="block w-full px-4 py-2 text-xs text-left hover:bg-gray-50">最大圧縮（小サイズ）</button>
            </div>
          )}
        </div>
      </div>

      {/* Action row: copy/paste actions (left side group) + page navigator (right side group) - grouped center */}
      <div className="border-t border-gray-100 bg-gray-50 flex items-center justify-center px-3 py-1 gap-3 flex-wrap">
        {/* Actions: copy/paste/undo/redo/clear */}
        <div className="flex items-center gap-0.5">
          <button onClick={duplicateAnnotation} disabled={!selectedAnnotationId}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="複製 (Ctrl+C)">📋<span className="hidden xl:inline ml-1">コピー</span></button>
          <button onClick={() => {
              const fn = (window as unknown as Record<string, () => void>).__pasteClipboardImage
              if (fn) fn()
            }}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white"
            title="クリップボード画像を貼付け (Ctrl+V)">📎<span className="hidden xl:inline ml-1">貼付け</span></button>
          <button onClick={undo} disabled={undoStack.length === 0}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="元に戻す (Ctrl+Z)">↩<span className="hidden xl:inline ml-1">戻す</span></button>
          <button onClick={redo} disabled={redoStack.length === 0}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="やり直し (Ctrl+Y)">↪<span className="hidden xl:inline ml-1">やり直し</span></button>
          <button onClick={() => clearPage(currentPage)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white"
            title="このページの注釈を全クリア">クリア</button>
        </div>

        {/* Page navigator pill */}
        {pdfDoc && (
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 shadow-sm">
            <button onClick={handlePrev} disabled={currentPage <= 1}
              className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="前のページ">◀</button>
            <span className="text-xs whitespace-nowrap px-1 min-w-[40px] text-center">
              <span className="font-semibold text-gray-700">{currentPage}</span>
              <span className="text-gray-400">/{totalPages}</span>
            </span>
            <button onClick={handleNext} disabled={currentPage >= totalPages}
              className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="次のページ">▶</button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button onClick={handleZoomOut}
              className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100"
              title="縮小">−</button>
            <span className="min-w-[40px] text-center text-xs text-gray-500 font-medium">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn}
              className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100"
              title="拡大">+</button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button onClick={handleCycleFit}
              className="px-2 py-0.5 text-xs rounded hover:bg-gray-100 text-gray-600 font-medium"
              title="表示サイズ切替">{NEXT_FIT_LABELS[fitMode]}</button>
          </div>
        )}
      </div>

      {/* Context bar (color/font/opacity etc) - shown only when tool/selection requires it */}
      <div className="min-h-[40px] border-t border-gray-100 bg-white flex items-center px-3 py-1">
        {showSubMenu ? (
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
              {subMenuContent()}
            </div>
            {hintText && (
              <span className="hidden md:block text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                {hintText}
              </span>
            )}
          </div>
        ) : hintText ? (
          <div className="flex-1 text-right">
            <span className="text-[11px] text-gray-400">{hintText}</span>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Stamp Picker - overlay */}
      {showStampPicker && !showSignatureEditor && (
        <>
        <div className="fixed inset-0 z-10" onClick={() => setShowStampPicker(false)} />
        <div className="absolute left-0 right-0 top-full z-20 px-3 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-md">
          {Object.entries(stampsByCategory).map(([category, stamps]) => (
            <div key={category} className="mb-2">
              <div className="text-xs text-gray-400 font-semibold mb-1">{category}</div>
              <div className="flex flex-wrap gap-1.5">
                {stamps.map((stamp) => (
                  <button key={stamp.id}
                    onClick={() => handleStampSelect(stamp.id, stamp.label, stamp.color)}
                    className="px-3 py-1.5 text-sm border-2 rounded hover:shadow transition-all font-bold"
                    style={{ borderColor: stamp.color, color: stamp.color }}>
                    {stamp.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {/* Compass stamp */}
          <div className="mb-2">
            <div className="text-xs text-gray-400 font-semibold mb-1">方位</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => handleStampSelect('compass', '', '#333333')}
                className="px-3 py-1.5 text-sm border-2 rounded hover:shadow transition-all font-bold border-gray-700 text-gray-700">
                ◎ 方位マーク
              </button>
            </div>
          </div>
          {/* Signature stamps - quick place */}
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-400 font-semibold mb-1">署名スタンプ</div>
            <div className="flex flex-wrap gap-1.5">
              {signatureTemplates.map((tmpl) => (
                <button key={tmpl.id}
                  onClick={() => handleQuickPlaceSignature(tmpl)}
                  className="px-3 py-1.5 text-sm border-2 border-indigo-400 text-indigo-600 rounded hover:shadow hover:bg-indigo-50 transition-all font-bold">
                  {tmpl.name}
                </button>
              ))}
              <button onClick={() => setShowSignatureEditor(true)}
                className="px-3 py-1.5 text-sm border-2 border-dashed border-gray-300 text-gray-400 rounded hover:border-indigo-400 hover:text-indigo-500 transition-all">
                + 管理
              </button>
            </div>
          </div>
        </div>
        </>
      )}
      {showSignatureEditor && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => {
            setShowSignatureEditor(false)
            setShowStampPicker(true)
            import('@/lib/signature-db').then(({ getAllSignatureTemplates }) =>
              getAllSignatureTemplates().then(setSignatureTemplates)
            )
          }} />
          <div className="absolute left-0 right-0 top-full z-20 bg-white border-b border-gray-200 shadow-lg">
            <SignatureEditor
              onPlace={handleSignaturePlace}
              onClose={() => {
                setShowSignatureEditor(false)
                setShowStampPicker(true)
                import('@/lib/signature-db').then(({ getAllSignatureTemplates }) =>
                  getAllSignatureTemplates().then(setSignatureTemplates)
                )
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
