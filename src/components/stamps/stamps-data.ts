export interface StampDef {
  id: string
  label: string
  category: string
  color: string
}

export const STAMP_PRESETS: StampDef[] = [
  { id: 'target-property', label: '対象物件', category: '不動産', color: '#dc2626' },
  { id: 'target-land', label: '当該地', category: '不動産', color: '#dc2626' },
  { id: 'nearest-station', label: '最寄駅', category: '不動産', color: '#1d4ed8' },
  { id: 'boundary-confirmed', label: '境界確定済', category: '不動産', color: '#059669' },
  { id: 'seller-property', label: '売主物件', category: '取引', color: '#7c3aed' },
  { id: 'deal-closed', label: '成約済', category: '取引', color: '#dc2626' },
  { id: 'in-negotiation', label: '商談中', category: '取引', color: '#ea580c' },
  { id: 'classified', label: '機密文書', category: '文書管理', color: '#dc2626' },
  { id: 'confidential', label: '社外秘', category: '文書管理', color: '#dc2626' },
]

// Special stamp: compass rose (方位マーク) - rendered as SVG-like drawing
export const COMPASS_STAMP_ID = 'compass'
