'use client'

import { useState, useEffect, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  text: string
  type: ToastType
}

let toastId = 0
let addToastFn: ((text: string, type: ToastType) => void) | null = null

// Global function to show toast from anywhere
export function showToast(text: string, type: ToastType = 'info') {
  if (addToastFn) {
    addToastFn(text, type)
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((text: string, type: ToastType) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, type === 'error' ? 5000 : 3000)
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.3s_ease] ${
            toast.type === 'error' ? 'bg-red-600 text-white' :
            toast.type === 'success' ? 'bg-green-600 text-white' :
            'bg-gray-800 text-white'
          }`}
          onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
        >
          {toast.text}
        </div>
      ))}
    </div>
  )
}
