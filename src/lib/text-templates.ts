// Preset text templates for real estate workflows
export interface TextTemplate {
  id: string
  category: string
  label: string
  text: string
}

export const TEXT_TEMPLATES: TextTemplate[] = [
  // 注意書き
  { id: 'copy-prohibition', category: '注意書き', label: '複製禁止', text: '※本資料の無断複製・転載を禁じます' },
  { id: 'confidential', category: '注意書き', label: '社外秘', text: '【社外秘】本資料は関係者限りとし、第三者への開示を禁じます' },
  { id: 'draft', category: '注意書き', label: '下書き', text: '【DRAFT】本資料は検討段階のものであり、最終版ではありません' },
  { id: 'as-of-date', category: '注意書き', label: '時点情報', text: '※本資料の情報は作成時点のものであり、最新の状況と異なる場合があります' },

  // 物件情報
  { id: 'current-priority', category: '物件情報', label: '現況優先', text: '※現況優先' },
  { id: 'disclosure', category: '物件情報', label: '告知事項あり', text: '※告知事項あり（詳細はお問い合わせください）' },
  { id: 'setback', category: '物件情報', label: 'セットバック', text: '※セットバック要（詳細は担当者にご確認ください）' },
  { id: 'rebuild-impossible', category: '物件情報', label: '再建築不可', text: '※再建築不可' },
  { id: 'old-quake', category: '物件情報', label: '旧耐震', text: '※旧耐震基準（1981年5月以前の建築確認）' },

  // 連絡先
  { id: 'viewing-tel', category: '連絡先', label: '内見予約', text: '内見予約: TEL 000-0000-0000' },
  { id: 'contact', category: '連絡先', label: 'お問合せ', text: 'お問い合わせ: TEL 000-0000-0000 / Email: info@example.com' },

  // 取引条件
  { id: 'tax-included', category: '取引条件', label: '税込', text: '※表示価格は税込みです' },
  { id: 'tax-excluded', category: '取引条件', label: '税別', text: '※表示価格は税別です' },
  { id: 'brokerage-fee', category: '取引条件', label: '仲介手数料', text: '※別途仲介手数料がかかります' },
]
