let counter = 0

export function generateId(): string {
  return `ann_${Date.now()}_${++counter}`
}
