'use client'

import { useEffect, useState } from 'react'
import { on, emit } from '@/lib/event-bus'
import { useEditorStore } from '@/hooks/useEditorStore'
import { TOOLS } from './Toolbar'

// ============================================================================
// HelpStrip
// ----------------------------------------------------------------------------
// ツールバーのボタンにマウスを乗せると、操作の説明を1行表示するヘルパー帯。
// page.tsx の編集領域上部に配置されている。
//
// 復活/廃止フラグ:
//   SHOW_HELP_STRIP を false にすると無条件で非表示になる。
//   ユーザーごとのON/OFFは store.helpEnabled で制御。
//
// 仕組み:
//   emit('help-hover', { title, description }) でホバー開始
//   emit('help-hover', null) でクリア
// ============================================================================

export const SHOW_HELP_STRIP = true

const HELP_ENABLED_KEY = 'pdf-editor:help-enabled'

// localStorage と store を同期するヘルパ。最初に呼んだ時点で初期化を行う。
export function useHelpEnabledSync() {
  const helpEnabled = useEditorStore((s) => s.helpEnabled)
  const setHelpEnabled = useEditorStore((s) => s.setHelpEnabled)
  // 初回マウント時に localStorage 値を反映
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HELP_ENABLED_KEY)
      if (raw !== null) {
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'boolean' && parsed !== helpEnabled) {
          setHelpEnabled(parsed)
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // 値変更時に localStorage に保存
  useEffect(() => {
    try { localStorage.setItem(HELP_ENABLED_KEY, JSON.stringify(helpEnabled)) } catch { /* ignore */ }
  }, [helpEnabled])
}

export default function HelpStrip() {
  const [hoverHint, setHoverHint] = useState<{ title: string; description: string } | null>(null)
  const helpEnabled = useEditorStore((s) => s.helpEnabled)
  const currentTool = useEditorStore((s) => s.currentTool)
  const editorMode = useEditorStore((s) => s.editorMode)

  useEffect(() => {
    const off = on('help-hover', (payload) => {
      setHoverHint(payload)
    })
    return off
  }, [])

  if (!SHOW_HELP_STRIP) return null
  if (!helpEnabled) return null

  // 表示優先度:
  // 1. マウスホバー中のヒント（一時表示）
  // 2. 描画編集モードで選択中のツールの説明（常駐表示）
  // 3. プレースホルダ
  let display: { title: string; description: string } | null = hoverHint
  if (!display && editorMode === 'drawing') {
    const tool = TOOLS.find((t) => t.id === currentTool)
    if (tool) display = { title: tool.label, description: tool.desc }
  }

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-3 py-1 text-xs text-slate-600 flex items-center gap-2 min-h-[24px] overflow-hidden">
      {display ? (
        <>
          <span className="text-indigo-500">ℹ</span>
          <span className="font-semibold text-slate-700">{display.title}</span>
          <span className="text-slate-400">—</span>
          <span className="truncate">{display.description}</span>
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
// 注意: helpEnabled が false でも emit はしますが、HelpStrip 側で非表示にしているので
// 副作用なし。コードを簡素にするため敢えてここではフラグを見ません。
// ----------------------------------------------------------------------------
export function helpHoverProps(title: string, description: string) {
  return {
    onMouseEnter: () => emit('help-hover', { title, description }),
    onMouseLeave: () => emit('help-hover', null),
  }
}
