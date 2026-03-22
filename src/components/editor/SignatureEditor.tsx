'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SignatureTemplate } from '@/types/annotations'
import { extractVariables, applyVariables, saveSignatureTemplate, getAllSignatureTemplates, deleteSignatureTemplate } from '@/lib/signature-db'
import { generateId } from '@/lib/id'

const DEFAULT_TEMPLATE = `◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆
株式会社 ネクスト・ワン
{名前}
東京都中央区京橋2丁目9-1 桃六ビル5階
TEL:03-3538-1700
FAX:03-3538-1772
Mobile:{携帯番号}
E-Mail:{メール}
◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆`

// Resize image to max dimensions and return base64
function resizeImage(file: File, maxW = 400, maxH = 400, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let w = img.width, h = img.height
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface Props {
  onPlace: (text: string, color: string, fontSize: number, fontFamily: string, imageData?: string, imagePosition?: 'top' | 'left' | 'right', imageScale?: number, showBorder?: boolean) => void
  onClose: () => void
}

export default function SignatureEditor({ onPlace, onClose }: Props) {
  const [templates, setTemplates] = useState<SignatureTemplate[]>([])
  const [editingTemplate, setEditingTemplate] = useState<SignatureTemplate | null>(null)
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Load templates
  useEffect(() => {
    getAllSignatureTemplates().then(setTemplates)
  }, [])

  const handleNewTemplate = () => {
    setEditingTemplate({
      id: generateId(),
      name: '署名テンプレート',
      template: DEFAULT_TEMPLATE,
      variables: {},
      fontSize: 11,
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
      color: '#1a1a1a',
      borderStyle: 'ornament',
    })
    setMode('edit')
  }

  const handleSave = async () => {
    if (!editingTemplate) return
    // Auto-detect variables and init empty values for new ones
    const vars = extractVariables(editingTemplate.template)
    const newVars = { ...editingTemplate.variables }
    for (const v of vars) {
      if (!(v in newVars)) newVars[v] = ''
    }
    // Remove vars no longer in template
    for (const k of Object.keys(newVars)) {
      if (!vars.includes(k)) delete newVars[k]
    }
    const updated = { ...editingTemplate, variables: newVars }
    await saveSignatureTemplate(updated)
    const all = await getAllSignatureTemplates()
    setTemplates(all)
    setEditingTemplate(updated)
    setMode('list')
  }

  const handleDelete = async (id: string) => {
    await deleteSignatureTemplate(id)
    const all = await getAllSignatureTemplates()
    setTemplates(all)
  }

  const handlePlace = useCallback((tmpl: SignatureTemplate) => {
    const text = applyVariables(tmpl.template, tmpl.variables)
    onPlace(text, tmpl.color, tmpl.fontSize, tmpl.fontFamily, tmpl.imageData, tmpl.imagePosition, tmpl.imageScale, tmpl.showBorder)
  }, [onPlace])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTemplate || !e.target.files?.[0]) return
    const base64 = await resizeImage(e.target.files[0])
    setEditingTemplate({ ...editingTemplate, imageData: base64, imagePosition: editingTemplate.imagePosition || 'top' })
    e.target.value = ''
  }

  const handleEdit = (tmpl: SignatureTemplate) => {
    setEditingTemplate({ ...tmpl })
    setMode('edit')
  }

  const updateVar = (key: string, value: string) => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      variables: { ...editingTemplate.variables, [key]: value },
    })
  }

  if (mode === 'edit' && editingTemplate) {
    const vars = extractVariables(editingTemplate.template)
    const preview = applyVariables(editingTemplate.template, editingTemplate.variables)

    return (
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 max-h-[60vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">署名テンプレート編集</h3>
          <button onClick={() => setMode('list')} className="text-xs text-gray-400 hover:text-gray-600">戻る</button>
        </div>

        {/* Template name */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">テンプレート名</label>
          <input type="text" value={editingTemplate.name}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
        </div>

        {/* Template text */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">テンプレート内容 <span className="text-gray-400">({'{'}変数名{'}'} で可変項目を設定)</span></label>
          <textarea value={editingTemplate.template}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, template: e.target.value })}
            rows={8}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono leading-relaxed resize-y" />
        </div>

        {/* Image upload */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">画像（ロゴ・名刺など）</label>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          {editingTemplate.imageData ? (
            <div className="flex items-start gap-3">
              <img src={editingTemplate.imageData} alt="ロゴ" className="max-w-[120px] max-h-[80px] border border-gray-200 rounded object-contain" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-gray-400">配置:</label>
                  {(['top', 'left', 'right'] as const).map((pos) => (
                    <button key={pos} onClick={() => setEditingTemplate({ ...editingTemplate, imagePosition: pos })}
                      className={`px-2 py-0.5 text-[10px] rounded border ${
                        (editingTemplate.imagePosition || 'top') === pos
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-400'
                      }`}>
                      {pos === 'top' ? '上' : pos === 'left' ? '左' : '右'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-gray-400">サイズ:</label>
                  <input type="range" min={10} max={200} value={editingTemplate.imageScale || 100}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, imageScale: parseInt(e.target.value) })}
                    className="w-20 accent-indigo-500" />
                  <span className="text-[10px] text-gray-400 min-w-[30px]">{editingTemplate.imageScale || 100}%</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => imageInputRef.current?.click()}
                    className="px-2 py-0.5 text-[10px] border border-gray-200 text-gray-400 rounded hover:bg-gray-50">変更</button>
                  <button onClick={() => setEditingTemplate({ ...editingTemplate, imageData: undefined, imagePosition: undefined, imageScale: undefined })}
                    className="px-2 py-0.5 text-[10px] border border-red-200 text-red-400 rounded hover:bg-red-50">削除</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => imageInputRef.current?.click()}
              className="px-3 py-2 text-xs border-2 border-dashed border-gray-300 text-gray-400 rounded-lg hover:border-indigo-400 hover:text-indigo-500 w-full">
              + 画像を追加
            </button>
          )}
        </div>

        {/* Variable settings */}
        {vars.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">変数設定</label>
            <div className="space-y-1.5">
              {vars.map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 min-w-[80px] font-mono">{'{' + v + '}'}</span>
                  <input type="text" value={editingTemplate.variables[v] || ''}
                    onChange={(e) => updateVar(v, e.target.value)}
                    placeholder={v}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Style settings */}
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">文字:</label>
            <input type="number" min={8} max={20} value={editingTemplate.fontSize}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, fontSize: parseInt(e.target.value) || 11 })}
              className="w-14 px-1.5 py-1 text-xs border border-gray-200 rounded" />
            <span className="text-xs text-gray-400">px</span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">色:</label>
            <input type="color" value={editingTemplate.color}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, color: e.target.value })}
              className="w-6 h-6 border border-gray-200 rounded cursor-pointer" />
          </div>
          <button onClick={() => setEditingTemplate({ ...editingTemplate, showBorder: !(editingTemplate.showBorder ?? true) })}
            className={`px-2.5 py-1 text-xs border rounded-lg ${
              (editingTemplate.showBorder ?? true)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-400'
            }`}>
            枠線{(editingTemplate.showBorder ?? true) ? 'あり' : 'なし'}
          </button>
        </div>

        {/* Preview */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">プレビュー</label>
          <div className={`bg-white rounded-lg p-3 inline-block ${(editingTemplate.showBorder ?? true) ? 'border-2' : ''}`}
            style={{ borderColor: (editingTemplate.showBorder ?? true) ? editingTemplate.color : undefined }}>
            <div className={`flex gap-2 ${
              editingTemplate.imagePosition === 'left' ? 'flex-row' :
              editingTemplate.imagePosition === 'right' ? 'flex-row-reverse' : 'flex-col'
            } items-center`}>
              {editingTemplate.imageData && (
                <img src={editingTemplate.imageData} alt="ロゴ" className="max-w-[100px] max-h-[60px] object-contain" />
              )}
              {preview.trim() && (
                <pre className="text-xs leading-relaxed whitespace-pre-wrap" style={{
                  color: editingTemplate.color,
                  fontSize: `${editingTemplate.fontSize}px`,
                  fontFamily: editingTemplate.fontFamily,
                }}>
                  {preview}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">
            保存
          </button>
          <button onClick={() => setMode('list')}
            className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  // List mode
  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">署名スタンプ</h3>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">閉じる</button>
      </div>

      {templates.length > 0 && (
        <div className="space-y-2 mb-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 p-2">
              <button onClick={() => handlePlace(tmpl)}
                className="flex-1 text-left text-xs font-semibold text-gray-700 hover:text-indigo-600 truncate"
                title="クリックで配置">
                {tmpl.name}
              </button>
              <button onClick={() => handleEdit(tmpl)}
                className="px-2 py-1 text-[10px] border border-gray-200 text-gray-400 rounded hover:bg-gray-50">
                編集
              </button>
              <button onClick={() => handleDelete(tmpl.id)}
                className="px-2 py-1 text-[10px] border border-red-200 text-red-400 rounded hover:bg-red-50">
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleNewTemplate}
        className="w-full px-3 py-2 text-sm border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors">
        + 新しい署名テンプレートを作成
      </button>
    </div>
  )
}
