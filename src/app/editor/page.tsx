'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import DropZone from '@/components/editor/DropZone'
import Toolbar from '@/components/editor/Toolbar'
import PageNavigator from '@/components/editor/PageNavigator'
import EditorCanvas from '@/components/editor/EditorCanvas'
import LoadingOverlay from '@/components/editor/LoadingOverlay'
import Script from 'next/script'

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
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [store])

  // Auto-save to IndexedDB
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!store.pdfBytes || !store.projectId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
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
        <h1 className="text-base sm:text-xl font-bold">不動産工房 <span className="text-xs sm:text-sm font-normal opacity-80">PDF編集</span></h1>
      </header>

      {pdfDoc ? (
        <>
          {/* Desktop: toolbar at top. Mobile: toolbar is fixed at bottom (rendered by Toolbar component) */}
          <Toolbar />
          <PageNavigator pdfDoc={pdfDoc} />
          <main className="flex-1 min-h-0 flex justify-center items-start overflow-auto p-2 sm:p-4 pb-20 sm:pb-4">
            <EditorCanvas pdfDoc={pdfDoc} />
          </main>
        </>
      ) : (
        <main className="flex-1 flex justify-center items-start px-4">
          <DropZone onFileLoad={handleFileLoad} onProjectLoad={handleProjectLoad} />
        </main>
      )}

      <LoadingOverlay />
    </div>
  )
}
