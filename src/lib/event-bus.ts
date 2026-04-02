// Type-safe event bus for inter-component communication
// Replaces window.__xxx global functions for security

type EventMap = {
  'place-stamp': { stampId: string; label: string; color: string }
  'stamp-leg-mode': undefined
  'place-signature': { text: string; color: string; fontSize: number; fontFamily: string; imageData?: string; imagePosition?: 'top' | 'left' | 'right'; imageScale?: number; showBorder?: boolean }
  'insert-template-text': string
  'paste-clipboard-image': undefined
  'edit-signature-text': { id: string; text: string }
  'load-project': string
}

type Callback<T> = T extends undefined ? () => void : (data: T) => void

const listeners = new Map<string, Set<Function>>()

export function on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(callback)
  return () => { listeners.get(event)?.delete(callback) }
}

export function emit<K extends keyof EventMap>(event: K, ...args: EventMap[K] extends undefined ? [] : [EventMap[K]]) {
  listeners.get(event)?.forEach((cb) => cb(...args))
}
