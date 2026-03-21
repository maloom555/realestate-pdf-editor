'use client'

import { useEditorStore } from '@/hooks/useEditorStore'

export default function LoadingOverlay() {
  const { isLoading, loadingText } = useEditorStore()

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-white/90 flex flex-col justify-center items-center gap-4 z-50">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">{loadingText || '処理中...'}</p>
    </div>
  )
}
