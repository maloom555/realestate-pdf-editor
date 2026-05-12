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
  { id: 'personal-info', category: '注意書き', label: '個人情報配慮', text: '※個人情報を含む資料につき、取り扱いにご注意ください' },

  // 物件情報
  { id: 'current-priority', category: '物件情報', label: '現況優先', text: '※現況優先' },
  { id: 'disclosure', category: '物件情報', label: '告知事項あり', text: '※告知事項あり（詳細はお問い合わせください）' },
  { id: 'setback', category: '物件情報', label: 'セットバック', text: '※セットバック要（詳細は担当者にご確認ください）' },
  { id: 'rebuild-impossible', category: '物件情報', label: '再建築不可', text: '※再建築不可' },
  { id: 'old-quake', category: '物件情報', label: '旧耐震', text: '※旧耐震基準（1981年5月以前の建築確認）' },
  { id: 'leasehold', category: '物件情報', label: '借地権物件', text: '※借地権物件（借地条件の詳細はお問い合わせください）' },
  { id: 'available-now', category: '物件情報', label: '即入居可', text: '即入居可' },
  { id: 'renovated', category: '物件情報', label: 'リフォーム済', text: 'リフォーム済' },

  // 媒介区分
  { id: 'seller-direct', category: '媒介区分', label: '売主物件', text: '売主物件（仲介手数料不要）' },
  { id: 'exclusive-right', category: '媒介区分', label: '専属専任媒介', text: '媒介区分: 専属専任媒介' },
  { id: 'exclusive', category: '媒介区分', label: '専任媒介', text: '媒介区分: 専任媒介' },
  { id: 'general-brokerage', category: '媒介区分', label: '一般媒介', text: '媒介区分: 一般媒介' },

  // 価格・取引条件
  { id: 'tax-included', category: '価格・取引条件', label: '税込', text: '※表示価格は税込みです' },
  { id: 'tax-excluded', category: '価格・取引条件', label: '税別', text: '※表示価格は税別です' },
  { id: 'brokerage-fee', category: '価格・取引条件', label: '仲介手数料', text: '※別途仲介手数料がかかります' },
  { id: 'price-revised', category: '価格・取引条件', label: '価格改定', text: '価格改定しました' },
  { id: 'price-negotiable', category: '価格・取引条件', label: '価格相談可', text: '価格相談可' },

  // 連絡先
  { id: 'viewing-tel', category: '連絡先', label: '内見予約', text: '内見予約: TEL 000-0000-0000' },
  { id: 'contact', category: '連絡先', label: 'お問合せ', text: 'お問い合わせ: TEL 000-0000-0000 / Email: info@example.com' },
]
