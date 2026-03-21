'use client'

import { useEditorStore } from '@/hooks/useEditorStore'
import type { ToolType, StampData } from '@/types/annotations'
import { STAMP_PRESETS } from '@/components/stamps/stamps-data'
import { useState, useRef } from 'react'

const tools: { id: ToolType; label: string; icon: string }[] = [
  { id: 'rect', label: '墨消し', icon: '■' },
  { id: 'pen', label: '自由線', icon: '〰' },
  { id: 'circle', label: '円', icon: '○' },
  { id: 'shape-rect', label: '四角', icon: '□' },
  { id: 'polyline', label: '折線', icon: '📐' },
  { id: 'arrow', label: '矢印', icon: '→' },
  { id: 'text', label: 'テキスト', icon: 'A' },
  { id: 'callout', label: '矢印テキスト', icon: '💬' },
  { id: 'highlight', label: 'ハイライト', icon: '🖍' },
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

export default function Toolbar() {
  const store = useEditorStore()
  const {
    currentTool, maskColor, penSize, fontSize, fontFamily, highlightOpacity, elementOpacity,
    fillEnabled, fillOpacity, textBold, textUnderline, textBox,
    selectedAnnotationId, annotations, currentPage, pdfBytes,
    setCurrentTool, setMaskColor, setPenSize, setFontSize, setFontFamily, setHighlightOpacity,
    setElementOpacity, setFillEnabled, setFillOpacity,
    setTextBold, setTextUnderline, setTextBox,
    removeAnnotation, updateAnnotation, undo, redo, clearPage, undoStack, redoStack,
  } = store

  const [showStampPicker, setShowStampPicker] = useState(false)
  const loadProjectInputRef = useRef<HTMLInputElement>(null)

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
    const fn = (window as unknown as Record<string, (...args: unknown[]) => void>).__placeStamp
    if (fn) fn(stampId, label, color)
    setShowStampPicker(false)
  }

  const handleDelete = () => {
    if (selectedAnnotationId) {
      removeAnnotation(currentPage, selectedAnnotationId)
    }
  }

  const handleExport = async () => {
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
        }
      )
      downloadBlob(result, 'edited_output.pdf', 'application/pdf')
    } catch (err) {
      alert('PDF出力に失敗しました: ' + (err as Error).message)
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
    a.download = 'project.rpef'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const fn = (window as unknown as Record<string, (json: string) => void>).__loadProject
      if (fn) fn(text)
    } catch (err) {
      alert('プロジェクト読み込みに失敗しました: ' + (err as Error).message)
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
  const isPolyline = selectedAnn && selectedAnn.type === 'polyline'
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
    if (isSelectedText && selectedAnn) {
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
  const displayFontFamily = isSelectedText && selectedAnn
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

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Main tool bar */}
      <div className="px-3 py-2 flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 border-2 rounded-lg text-xs transition-all
                ${currentTool === tool.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-500'
                }`}
              title={tool.label}
            >
              <span className="text-base leading-none">{tool.icon}</span>
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={undoStack.length === 0}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            title="元に戻す (Ctrl+Z)">↩ 戻す</button>
          <button onClick={redo} disabled={redoStack.length === 0}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            title="やり直し (Ctrl+Y)">↪ やり直し</button>
          <button onClick={() => clearPage(currentPage)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">クリア</button>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        <div className="flex items-center gap-1">
          <button onClick={handleSaveProject} disabled={!pdfBytes}
            className="px-3 py-1.5 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-30 disabled:cursor-not-allowed"
            title="編集内容をファイルに保存して後から再開できます">💾 保存</button>
          <button onClick={() => loadProjectInputRef.current?.click()}
            className="px-3 py-1.5 text-xs border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
            title="保存したプロジェクトファイルを読み込みます">📂 読込</button>
          <input ref={loadProjectInputRef} type="file" accept=".rpef,.json" className="hidden" onChange={handleLoadProject} />
        </div>

        <div className="w-px h-6 bg-gray-200" />

        <button onClick={handleExport}
          className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
          PDFダウンロード
        </button>
      </div>

      {/* Sub-menu bar */}
      {showSubMenu && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-center gap-3 flex-wrap">
          {/* Color palette */}
          {(showColorPicker || canChangeColor) && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400 font-semibold">色:</label>
              <div className="flex items-center gap-0.5">
                {COLOR_PALETTE.map((c) => (
                  <button key={c} onClick={() => handleColorChange(c)}
                    className={`w-5 h-5 rounded-sm border-2 transition-all ${
                      (canChangeColor ? selectedAnn.color : maskColor) === c
                        ? 'border-indigo-500 scale-125' : 'border-gray-300 hover:border-indigo-400'
                    }`}
                    style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <input type="color" value={canChangeColor ? selectedAnn.color : maskColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-6 h-6 border border-gray-300 rounded cursor-pointer p-0" title="カスタムカラー" />
            </div>
          )}

          {/* Pen size (1-20) */}
          {(showPenSize || canAdjustSize) && (
            <>
              <div className="w-px h-5 bg-gray-300" />
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-400 font-semibold">太さ:</label>
                <input type="range" min={1} max={20}
                  value={canAdjustSize ? (selectedAnn.size || 2) : penSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (canAdjustSize) updateAnnotation(currentPage, selectedAnn.id, { size: v })
                    else setPenSize(v)
                  }}
                  className="w-20 accent-indigo-500" />
                <span className="text-xs text-gray-400 min-w-[30px]">
                  {canAdjustSize ? (selectedAnn.size || 2) : penSize}px
                </span>
              </div>
            </>
          )}

          {/* Font options */}
          {(showFontOptions || isSelectedText || isSelectedCallout) && (
            <>
              <div className="w-px h-5 bg-gray-300" />
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-400 font-semibold">文字サイズ:</label>
                <input type="range" min={1} max={100} value={displayFontSize}
                  onChange={(e) => handleSelectedFontSizeChange(parseInt(e.target.value))}
                  className="w-20 accent-indigo-500" />
                <span className="text-xs text-gray-400 min-w-[30px]">{displayFontSize}px</span>
              </div>
              {(currentTool === 'text' || isSelectedText) && (
                <>
                  <div className="w-px h-5 bg-gray-300" />
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">フォント:</label>
                    <select value={displayFontFamily} onChange={(e) => handleFontFamilyChange(e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-700">
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {/* Bold / Underline / TextBox */}
              <div className="w-px h-5 bg-gray-300" />
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
                  className={`px-2 py-1 text-xs font-bold border rounded-lg ${
                    displayBold ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-indigo-400'
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
                  className={`px-2 py-1 text-xs underline border rounded-lg ${
                    displayUnderline ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-indigo-400'
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
                    className={`px-2 py-1 text-xs border rounded-lg ${
                      displayTextBox ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-indigo-400'
                    }`} title="テキストボックス">枠</button>
                )}
              </div>
            </>
          )}

          {/* Opacity (all tools) */}
          <>
            <div className="w-px h-5 bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400 font-semibold">透過:</label>
              <input type="range" min={5} max={100} value={displayOpacity}
                onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                className="w-16 accent-indigo-500" />
              <span className="text-xs text-gray-400 min-w-[30px]">{displayOpacity}%</span>
            </div>
          </>

          {/* Fill controls (circle, shape-rect, pen, polyline) */}
          {(showFillForTool || showFillForSelected) && (
            <>
              <div className="w-px h-5 bg-gray-300" />
              <button onClick={handleFillToggle}
                className={`px-2 py-1 text-xs border rounded-lg ${
                  displayFillEnabled
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-indigo-400'
                }`}>
                塗り
              </button>
              {displayFillEnabled && (
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-400">濃さ:</label>
                  <input type="range" min={5} max={100} value={displayFillOpacity}
                    onChange={(e) => handleFillOpacityChange(parseInt(e.target.value))}
                    className="w-14 accent-indigo-500" />
                  <span className="text-xs text-gray-400 min-w-[24px]">{displayFillOpacity}%</span>
                </div>
              )}
            </>
          )}

          {/* Close path toggle (pen/polyline when selected) */}
          {showCloseForSelected && (
            <button onClick={handleCloseToggle}
              className={`px-2 py-1 text-xs border rounded-lg ${
                selectedAnn.closed
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-500 hover:border-indigo-400'
              }`}>
              閉じる
            </button>
          )}

          {/* Polyline arrow toggles */}
          {isPolyline && (
            <>
              <div className="w-px h-5 bg-gray-300" />
              <button onClick={() => {
                const d = selectedAnn.data as { arrowStart: boolean; arrowEnd: boolean }
                updateAnnotation(currentPage, selectedAnn.id, {
                  data: { ...selectedAnn.data, arrowStart: !d.arrowStart } as unknown as typeof selectedAnn.data,
                })
              }}
                className={`px-2 py-1 text-xs border rounded-lg ${
                  (selectedAnn.data as { arrowStart: boolean }).arrowStart
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-indigo-400'
                }`}>←始点</button>
              <button onClick={() => {
                const d = selectedAnn.data as { arrowStart: boolean; arrowEnd: boolean }
                updateAnnotation(currentPage, selectedAnn.id, {
                  data: { ...selectedAnn.data, arrowEnd: !d.arrowEnd } as unknown as typeof selectedAnn.data,
                })
              }}
                className={`px-2 py-1 text-xs border rounded-lg ${
                  (selectedAnn.data as { arrowEnd: boolean }).arrowEnd
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-indigo-400'
                }`}>終点→</button>
            </>
          )}

          {/* Stamp leg/arrow toggle */}
          {isSelectedStamp && (
            <>
              <div className="w-px h-5 bg-gray-300" />
              <button onClick={() => {
                const sd = selectedAnn.data as StampData
                if (sd.legX != null) {
                  // Remove leg
                  updateAnnotation(currentPage, selectedAnn.id, {
                    data: { ...selectedAnn.data, legX: undefined, legY: undefined } as unknown as typeof selectedAnn.data,
                  })
                } else {
                  // Enable leg placement mode
                  const fn = (window as unknown as Record<string, () => void>).__stampLegMode
                  if (fn) fn()
                }
              }}
                className={`px-2 py-1 text-xs border rounded-lg ${
                  (selectedAnn.data as StampData).legX != null
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-indigo-400'
                }`}>
                {(selectedAnn.data as StampData).legX != null ? '引出線✓' : '引出線'}
              </button>
            </>
          )}

          {/* Select tool info & delete */}
          {currentTool === 'select' && (
            <>
              <div className="w-px h-5 bg-gray-300" />
              <span className="text-xs text-gray-400">
                {selectedAnnotationId
                  ? selectedAnn?.type === 'callout'
                    ? 'ダブルクリックで編集 / 黄◆で矢印移動'
                    : 'ダブルクリックで再編集'
                  : 'クリックで選択'}
              </span>
              {selectedAnnotationId && (
                <button onClick={handleDelete}
                  className="px-3 py-1 text-xs border border-red-300 text-red-500 rounded-lg hover:bg-red-50">削除</button>
              )}
            </>
          )}
        </div>
      )}

      {/* Stamp Picker */}
      {showStampPicker && (
        <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
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
        </div>
      )}
    </div>
  )
}
