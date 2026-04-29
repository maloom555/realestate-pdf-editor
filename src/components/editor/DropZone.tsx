'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { ProjectRecord } from '@/lib/project-db'

interface DropZoneProps {
  onFileLoad: (file: File) => void
  onFilesLoad?: (files: File[]) => void
  onProjectLoad?: (projectId: string) => void
}

export default function DropZone({ onFileLoad, onFilesLoad, onProjectLoad }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [savedProjects, setSavedProjects] = useState<ProjectRecord[]>([])

  useEffect(() => {
    import('@/lib/project-db').then(({ listProjects }) => {
      listProjects().then(setSavedProjects).catch(console.error)
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    const validFiles = Array.from(e.dataTransfer.files).filter((f) => acceptedTypes.includes(f.type))
    if (validFiles.length === 0) return
    if (validFiles.length === 1) {
      onFileLoad(validFiles[0])
    } else if (onFilesLoad) {
      onFilesLoad(validFiles)
    } else {
      onFileLoad(validFiles[0])
    }
  }, [onFileLoad, onFilesLoad])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (files.length === 1) {
      onFileLoad(files[0])
    } else if (onFilesLoad) {
      onFilesLoad(files)
    } else {
      onFileLoad(files[0])
    }
  }, [onFileLoad, onFilesLoad])

  const handleDelete = useCallback(async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (!confirm('このプロジェクトを削除しますか？')) return
    try {
      const { deleteProject } = await import('@/lib/project-db')
      await deleteProject(projectId)
      setSavedProjects((prev) => prev.filter((p) => p.id !== projectId))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }, [])

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-6 sm:my-12 px-4">
      {/* Drop zone */}
      <div
        className={`flex justify-center items-center w-full border-3 border-dashed rounded-2xl p-8 sm:p-16 bg-white transition-all
          ${isDragOver ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-indigo-200'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="mx-auto mb-3 sm:mb-4 sm:w-16 sm:h-16">
            <rect x="8" y="4" width="48" height="56" rx="4" stroke="#6366f1" strokeWidth="3"/>
            <path d="M20 20H44M20 28H44M20 36H36" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="46" cy="46" r="14" fill="#6366f1"/>
            <path d="M46 39V53M39 46H53" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <p className="text-base sm:text-lg text-gray-600 font-medium">PDF・画像ファイルをドラッグ＆ドロップ</p>
          <p className="text-gray-300 text-xs mt-1">複数ファイルをまとめてドロップで自動結合</p>
          <p className="text-gray-400 text-sm my-2 sm:my-3">または</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-7 py-2.5 bg-indigo-600 text-white rounded-xl text-base font-semibold hover:bg-indigo-700 transition-colors"
          >
            ファイルを選択
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Saved projects */}
      {savedProjects.length > 0 && (
        <div className="mt-8">
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700">直前の編集</h2>
            <span className="text-xs text-gray-400">自動保存・最新{savedProjects.length}件</span>
          </div>
          <div className="space-y-2">
            {savedProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onProjectLoad?.(project.id)}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M5 5h6M5 7.5h6M5 10h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{project.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(project.updatedAt)} ・ {project.totalPages}ページ</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 rounded"
                  title="削除"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
