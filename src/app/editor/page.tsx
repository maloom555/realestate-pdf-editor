'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import DropZone from '@/components/editor/DropZone'
import Toolbar from '@/components/editor/Toolbar'
import PageNavigator from '@/components/editor/PageNavigator'
import EditorCanvas from '@/components/editor/EditorCanvas'
import PageEditor from '@/components/editor/PageEditor'
import LoadingOverlay from '@/components/editor/LoadingOverlay'
import Script from 'next/script'
import { generateId } from '@/lib/id'
import type { Annotation } from '@/types/annotations'

export default function EditorPage() {
  const store = useEditorStore()
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)

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

  // Clipboard for copy/paste
  const clipboardRef = useRef<{ annotation: Annotation; page: number } | null>(null)

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
      if (e.key === 'Delete' && store.selectedAnnotationId) {
        store.removeAnnotation(store.currentPage, store.selectedAnnotationId)
      }
      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key === 'c' && store.selectedAnnotationId) {
        e.preventDefault()
        const anns = store.annotations[store.currentPage] || []
        const selected = anns.find((a) => a.id === store.selectedAnnotationId)
        if (selected) {
          clipboardRef.current = { annotation: structuredClone(selected), page: store.currentPage }
        }
      }
      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === 'v' && clipboardRef.current) {
        e.preventDefault()
        const { annotation: src } = clipboardRef.current
        const offset = 15 // Offset so pasted element is visibly separate
        const newAnn: Annotation = structuredClone(src)
        newAnn.id = generateId()

        // Offset position based on annotation type
        const data = newAnn.data as unknown as Record<string, unknown>
        if ('x' in data && 'y' in data) {
          data.x = (data.x as number) + offset
          data.y = (data.y as number) + offset
        }
        if ('startX' in data && 'startY' in data) {
          data.startX = (data.startX as number) + offset
          data.startY = (data.startY as number) + offset
        }
        if ('endX' in data && 'endY' in data) {
          data.endX = (data.endX as number) + offset
          data.endY = (data.endY as number) + offset
        }
        if ('points' in data && Array.isArray(data.points)) {
          data.points = (data.points as { x: number; y: number }[]).map((p) => ({
            x: p.x + offset,
            y: p.y + offset,
          }))
        }

        store.addAnnotation(store.currentPage, newAnn)
        store.setSelectedAnnotationId(newAnn.id)
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
    }, 2000)
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
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 text-center cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleReset}
        title="トップに戻る"
      >
        <h1 className="text-base sm:text-xl font-bold">不動産PDF工房</h1>
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
    </div>
  )
}
