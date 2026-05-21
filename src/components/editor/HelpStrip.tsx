'use client'

import { useEffect, useState } from 'react'
import { on, emit } from '@/lib/event-bus'

// ============================================================================
// HelpStrip
// ----------------------------------------------------------------------------
// ツールバーのボタンにマウスを乗せると、操作の説明を1行表示するヘルパー帯。
// page.tsx の編集領域上部に配置されている。
//
// 復活/廃止フラグ:
//   SHOW_HELP_STRIP を false にすると非表示になる。
//   page.tsx で <HelpStrip /> の表示自体を切る、または本ファイルで return null。
//
// 仕組み:
//   emit('help-hover', { title, description }) でホバー開始
//   emit('help-hover', null) でクリア
// ============================================================================

export const SHOW_HELP_STRIP = true

export default function HelpStrip() {
  const [hint, setHint] = useState<{ title: string; description: string } | null>(null)

  useEffect(() => {
    const off = on('help-hover', (payload) => {
      setHint(payload)
    })
    return off
  }, [])

  if (!SHOW_HELP_STRIP) return null

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-3 py-1 text-xs text-slate-600 flex items-center gap-2 min-h-[24px] overflow-hidden">
      {hint ? (
        <>
          <span className="text-indigo-500">ℹ</span>
          <span className="font-semibold text-slate-700">{hint.title}</span>
          <span className="text-slate-400">—</span>
          <span className="truncate">{hint.description}</span>
        </>
      ) : (
        <span className="text-slate-300">ℹ ボタンにマウスを乗せると説明が表示されます</span>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Hover handlers util: spread these onto buttons.
//   <button {...helpHoverProps('墨消し', '...')}>...</button>
// ----------------------------------------------------------------------------
export function helpHoverProps(title: string, description: string) {
  return {
    onMouseEnter: () => emit('help-hover', { title, description }),
    onMouseLeave: () => emit('help-hover', null),
  }
}
