'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import DropZone from '@/components/editor/DropZone'
import Toolbar from '@/components/editor/Toolbar'
import PageNavigator from '@/components/editor/PageNavigator'
import EditorCanvas from '@/components/editor/EditorCanvas'
import PageEditor from '@/components/editor/PageEditor'
import LoadingOverlay from '@/components/editor/LoadingOverlay'
import HelpModal from '@/components/editor/HelpModal'
import Script from 'next/script'

export default function EditorPage() {
  const store = useEditorStore()
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const handlePdfJsLoad = useCallback(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    setPdfJsLoaded(true)
  }, [])

  const handleFileLoad = useCallback(async (file: File) => {
    if (!pdfJsLoaded) return
    store.setLoading(true, 'PDFを読み込み中...')
    try {
      const arrayBuffer = await file.arrayBuffer()
      let bytes: Uint8Array = new Uint8Array(arrayBuffer)
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (imageTypes.includes(file.type)) {
        const { imageToPdf } = await import('@/lib/image-to-pdf')
        bytes = new Uint8Array(await imageToPdf(bytes, file.type))
      }
      const doc = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise

      store.setPdfBytes(bytes, doc.numPages)
      const projectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      store.setProjectId(projectId)
      store.setProjectName(file.name.replace(/\.[^.]+$/, ''))
      store.setScale(1.0)
      store.setFitMode(2) // fitMode=2 is 100%, so next click shows '縦フィット'
      setPdfDoc(doc)
    } catch (err) {
      alert('PDFの読み込みに失敗しました: ' + (err as Error).message)
    } finally {
      store.setLoading(false)
    }
  }, [store, pdfJsLoaded])

  // Multiple files → merge into one PDF
  const handleFilesLoad = useCallback(async (files: File[]) => {
    if (!pdfJsLoaded) return
    store.setLoading(true, `${files.length}ファイルを結合中...`)
    try {
      const { mergeFiles } = await import('@/lib/merge-files')
      const bytes = await mergeFiles(files, (current, total) => {
        store.setLoading(true, `結合中... ${current} / ${total} ファイル`)
      })
      const doc = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise

      store.setPdfBytes(bytes, doc.numPages)
      const projectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      store.setProjectId(projectId)
      store.setProjectName('merged_' + files.length + 'files')
      store.setScale(1.0)
      store.setFitMode(2)
      setPdfDoc(doc)
    } catch (err) {
      alert('ファイルの結合に失敗しました: ' + (err as Error).message)
    } finally {
      store.setLoading(false)
    }
  }, [store, pdfJsLoaded])

  const handleReset = useCallback(() => {
    if (!pdfDoc) return
    if (!confirm('現在の編集内容は破棄されます。トップに戻りますか？')) return
    store.resetEditor()
    setPdfDoc(null)
  }, [pdfDoc, store])

  // Register __loadProject callback for Toolbar
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__loadProject = async (json: string) => {
      if (!pdfJsLoaded) { alert('PDF.jsがまだ読み込まれていません。しばらく待ってから再試行してください。'); return }
      store.setLoading(true, 'プロジェクトを読み込み中...')
      try {
        const data = JSON.parse(json)
        const binary = atob(data.pdfBase64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const doc = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise
        store.loadProject(bytes, doc.numPages, data.annotations || {}, data.currentPage || 1)
        setPdfDoc(doc)
      } catch (err) {
        alert('プロジェクト読み込みに失敗しました: ' + (err as Error).message)
      } finally {
        store.setLoading(false)
      }
    }
  }, [store, pdfJsLoaded])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        store.undo()
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        store.redo()
      }
      if (e.key === 'Delete') {
        if (store.selectedAnnotationIds.size > 1) {
          // Delete all multi-selected annotations
          for (const id of store.selectedAnnotationIds) {
            store.removeAnnotation(store.currentPage, id)
          }
          store.clearMultiSelection()
        } else if (store.selectedAnnotationId) {
          store.removeAnnotation(store.currentPage, store.selectedAnnotationId)
        }
      }
      // Duplicate (Ctrl+C = copy + paste immediately)
      if (e.ctrlKey && e.key === 'c' && store.selectedAnnotationId) {
        e.preventDefault()
        store.duplicateAnnotation()
      }
      // Arrow keys: nudge selected annotations
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (arrowKeys.includes(e.key) && (store.selectedAnnotationId || store.selectedAnnotationIds.size > 0)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const ids = store.selectedAnnotationIds.size > 0 ? store.selectedAnnotationIds : new Set([store.selectedAnnotationId!])
        const pageAnns = store.annotations[store.currentPage] || []
        for (const id of ids) {
          const ann = pageAnns.find(a => a.id === id)
          if (!ann) continue
          const d = ann.data as unknown as Record<string, unknown>
          if (ann.type === 'arrow' || ann.type === 'callout') {
            store.updateAnnotation(store.currentPage, id, {
              data: { ...ann.data, startX: (d.startX as number) + dx, startY: (d.startY as number) + dy, endX: (d.endX as number) + dx, endY: (d.endY as number) + dy } as any,
            })
          } else if (ann.type === 'pen') {
            const pts = d as unknown as Array<{x: number; y: number}>
            store.updateAnnotation(store.currentPage, id, {
              data: pts.map(p => ({ x: p.x + dx, y: p.y + dy })) as any,
            })
          } else if (ann.type === 'polyline') {
            const pd = d as { points: Array<{x: number; y: number}> }
            store.updateAnnotation(store.currentPage, id, {
              data: { ...ann.data, points: pd.points.map(p => ({ x: p.x + dx, y: p.y + dy })) } as any,
            })
          } else if (typeof d.x === 'number') {
            const updated: Record<string, unknown> = { ...d, x: (d.x as number) + dx, y: (d.y as number) + dy }
            if (typeof d.legX === 'number') { updated.legX = (d.legX as number) + dx; updated.legY = (d.legY as number) + dy }
            store.updateAnnotation(store.currentPage, id, { data: updated as any })
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [store])

  // Auto-save to IndexedDB
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!store.pdfBytes || !store.projectId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    // Larger files get longer debounce to avoid frequent writes
    const fileSize = store.pdfBytes?.length || 0
    const debounceMs = fileSize > 5 * 1024 * 1024 ? 5000 : 2000
    saveTimerRef.current = setTimeout(async () => {
      try {
        const { saveProject } = await import('@/lib/project-db')
        await saveProject({
          id: store.projectId!,
          name: store.projectName || '無題',
          pdfBytes: store.pdfBytes!,
          annotations: store.annotations,
          currentPage: store.currentPage,
          totalPages: store.totalPages,
          updatedAt: Date.now(),
        })
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, debounceMs)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [store.annotations, store.currentPage, store.pdfBytes, store.projectId, store.projectName, store.totalPages])

  // Reload pdf.js document after page operations
  const reloadPdfDoc = useCallback(async (newBytes: Uint8Array) => {
    const doc = await window.pdfjsLib.getDocument({ data: newBytes.slice() }).promise
    setPdfDoc(doc)
  }, [])

  const handleProjectLoad = useCallback(async (projectId: string) => {
    if (!pdfJsLoaded) return
    store.setLoading(true, 'プロジェクトを読み込み中...')
    try {
      const { loadProject } = await import('@/lib/project-db')
      const project = await loadProject(projectId)
      if (!project) { alert('プロジェクトが見つかりません'); return }
      const doc = await window.pdfjsLib.getDocument({ data: project.pdfBytes.slice() }).promise
      store.loadProject(project.pdfBytes, doc.numPages, project.annotations, project.currentPage)
      store.setProjectId(projectId)
      store.setProjectName(project.name)
      store.setScale(1.0)
      store.setFitMode(2)
      setPdfDoc(doc)
    } catch (err) {
      alert('プロジェクト読み込みに失敗: ' + (err as Error).message)
    } finally {
      store.setLoading(false)
    }
  }, [store, pdfJsLoaded])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="afterInteractive"
        onLoad={handlePdfJsLoad}
      />

      {/* Header - compact on mobile */}
      <header
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between"
      >
        <div className="w-8" />
        <h1 className="text-base sm:text-xl font-bold cursor-pointer hover:opacity-80 transition-opacity" onClick={handleReset} title="トップに戻る">不動産PDF工房</h1>
        <button onClick={() => setShowHelp(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm font-bold"
          title="使い方ガイド">?</button>
      </header>

      {pdfDoc ? (
        <>
          {/* Mode tabs */}
          <div className="flex bg-white border-b border-gray-200">
            <button
              onClick={() => store.setEditorMode('drawing')}
              className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium transition-colors relative
                ${store.editorMode === 'drawing'
                  ? 'text-indigo-700'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              描画編集
              {store.editorMode === 'drawing' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
            <button
              onClick={() => store.setEditorMode('pageEditor')}
              className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium transition-colors relative
                ${store.editorMode === 'pageEditor'
                  ? 'text-indigo-700'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              ページ編集
              {store.editorMode === 'pageEditor' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          </div>

          {store.editorMode === 'drawing' ? (
            <>
              <Toolbar />
              <PageNavigator pdfDoc={pdfDoc} />
              <main className="flex-1 min-h-0 flex justify-center items-start overflow-auto p-2 sm:p-4">
                <EditorCanvas pdfDoc={pdfDoc} />
              </main>
            </>
          ) : (
            <PageEditor pdfDoc={pdfDoc} onReloadPdf={reloadPdfDoc} />
          )}
        </>
      ) : (
        <main className="flex-1 flex justify-center items-start px-4">
          <DropZone onFileLoad={handleFileLoad} onFilesLoad={handleFilesLoad} onProjectLoad={handleProjectLoad} />
        </main>
      )}

      <LoadingOverlay />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
