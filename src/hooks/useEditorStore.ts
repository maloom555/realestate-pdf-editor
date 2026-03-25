import { create } from 'zustand'
import type { Annotation, ToolType, HistoryEntry, EditorMode } from '@/types/annotations'
import { generateId } from '@/lib/id'

interface EditorState {
  // Project
  projectId: string | null
  projectName: string

  // Document
  pdfBytes: Uint8Array | null
  currentPage: number
  totalPages: number
  scale: number
  fitMode: number // 0=縦, 1=横, 2=100%

  // Tools
  currentTool: ToolType
  maskColor: string
  penSize: number
  fontSize: number
  fontFamily: string
  highlightOpacity: number
  elementOpacity: number
  fillEnabled: boolean
  fillOpacity: number
  textBold: boolean
  textUnderline: boolean
  textBox: boolean

  // Annotations (per-page)
  annotations: Record<number, Annotation[]>

  // Selection
  selectedAnnotationId: string | null
  selectedAnnotationIds: Set<string>

  // History
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]

  // Editor mode
  editorMode: EditorMode
  selectedPages: Set<number>

  // Page operation history
  pageUndoStack: { pdfBytes: Uint8Array; totalPages: number; annotations: Record<number, Annotation[]> }[]

  // Clipboard
  clipboardAnnotation: Annotation | null

  // UI state
  isLoading: boolean
  loadingText: string

  // Actions
  setEditorMode: (mode: EditorMode) => void
  togglePageSelection: (pageNum: number) => void
  selectAllPages: () => void
  clearPageSelection: () => void
  applyPageOperation: (newPdfBytes: Uint8Array, newTotalPages: number, newAnnotations: Record<number, Annotation[]>) => void
  undoPageOperation: () => { pdfBytes: Uint8Array; totalPages: number; annotations: Record<number, Annotation[]> } | null
  setPdfBytes: (bytes: Uint8Array, totalPages: number) => void
  setCurrentPage: (page: number) => void
  setScale: (scale: number) => void
  setFitMode: (mode: number) => void
  setCurrentTool: (tool: ToolType) => void
  setMaskColor: (color: string) => void
  setPenSize: (size: number) => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  setHighlightOpacity: (opacity: number) => void
  setElementOpacity: (opacity: number) => void
  setFillEnabled: (enabled: boolean) => void
  setFillOpacity: (opacity: number) => void
  setTextBold: (bold: boolean) => void
  setTextUnderline: (underline: boolean) => void
  setTextBox: (textBox: boolean) => void
  loadProject: (bytes: Uint8Array, totalPages: number, annotations: Record<number, Annotation[]>, currentPage: number) => void
  addAnnotation: (pageNum: number, annotation: Annotation) => void
  removeAnnotation: (pageNum: number, id: string) => void
  updateAnnotation: (pageNum: number, id: string, data: Partial<Annotation>) => void
  setSelectedAnnotationId: (id: string | null) => void
  toggleSelectedAnnotation: (id: string) => void
  clearMultiSelection: () => void
  clearPage: (pageNum: number) => void
  undo: () => void
  redo: () => void
  setProjectId: (id: string | null) => void
  setProjectName: (name: string) => void
  setLoading: (loading: boolean, text?: string) => void
  copyAnnotation: () => void
  pasteAnnotation: () => void
  duplicateAnnotation: () => void
  resetEditor: () => void
}

const initialState = {
  projectId: null as string | null,
  projectName: '',
  pdfBytes: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.0,
  fitMode: 2, // 0=縦フィット, 1=横フィット, 2=100%
  currentTool: 'select' as ToolType,
  maskColor: '#000000',
  penSize: 3,
  fontSize: 15,
  fontFamily: 'Noto Sans JP',
  highlightOpacity: 0.3,
  elementOpacity: 1.0,
  fillEnabled: false,
  fillOpacity: 0.3,
  textBold: false,
  textUnderline: false,
  textBox: false,
  annotations: {} as Record<number, Annotation[]>,
  selectedAnnotationId: null,
  selectedAnnotationIds: new Set<string>(),
  undoStack: [] as HistoryEntry[],
  redoStack: [] as HistoryEntry[],
  editorMode: 'drawing' as EditorMode,
  selectedPages: new Set<number>(),
  pageUndoStack: [] as { pdfBytes: Uint8Array; totalPages: number; annotations: Record<number, Annotation[]> }[],
  clipboardAnnotation: null as Annotation | null,
  isLoading: false,
  loadingText: '',
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  setPdfBytes: (bytes, totalPages) =>
    set({ pdfBytes: bytes, totalPages, currentPage: 1, annotations: {}, undoStack: [], redoStack: [] }),

  setCurrentPage: (page) => set({ currentPage: page, selectedAnnotationId: null }),

  setScale: (scale) => set({ scale }),

  setFitMode: (mode) => set({ fitMode: mode }),

  setCurrentTool: (tool) => set({ currentTool: tool, selectedAnnotationId: null }),

  setMaskColor: (color) => set({ maskColor: color }),

  setPenSize: (size) => set({ penSize: size }),

  setFontSize: (size) => set({ fontSize: size }),

  setFontFamily: (family) => set({ fontFamily: family }),

  setHighlightOpacity: (opacity) => set({ highlightOpacity: opacity }),

  setElementOpacity: (opacity) => set({ elementOpacity: opacity }),

  setFillEnabled: (enabled) => set({ fillEnabled: enabled }),

  setFillOpacity: (opacity) => set({ fillOpacity: opacity }),

  setTextBold: (bold) => set({ textBold: bold }),

  setTextUnderline: (underline) => set({ textUnderline: underline }),

  setTextBox: (textBox) => set({ textBox }),

  loadProject: (bytes, totalPages, annotations, currentPage) =>
    set({ pdfBytes: bytes, totalPages, annotations, currentPage, undoStack: [], redoStack: [], selectedAnnotationId: null }),

  addAnnotation: (pageNum, annotation) => {
    const state = get()
    const current = state.annotations[pageNum] || []
    // Save to undo stack
    const undoEntry: HistoryEntry = { pageNum, annotations: [...current] }
    set({
      annotations: { ...state.annotations, [pageNum]: [...current, annotation] },
      undoStack: [...state.undoStack, undoEntry],
      redoStack: [],
    })
  },

  removeAnnotation: (pageNum, id) => {
    const state = get()
    const current = state.annotations[pageNum] || []
    const undoEntry: HistoryEntry = { pageNum, annotations: [...current] }
    set({
      annotations: {
        ...state.annotations,
        [pageNum]: current.filter((a) => a.id !== id),
      },
      undoStack: [...state.undoStack, undoEntry],
      redoStack: [],
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })
  },

  updateAnnotation: (pageNum, id, updates) => {
    const state = get()
    const current = state.annotations[pageNum] || []
    set({
      annotations: {
        ...state.annotations,
        [pageNum]: current.map((a) =>
          a.id === id ? { ...a, ...updates } as Annotation : a
        ),
      },
    })
  },

  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id, selectedAnnotationIds: id ? new Set([id]) : new Set() }),

  toggleSelectedAnnotation: (id) => {
    const state = get()
    const newSet = new Set(state.selectedAnnotationIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    // Primary selection = last toggled (or first in set)
    const primary = newSet.size > 0 ? (newSet.has(id) ? id : Array.from(newSet)[0]) : null
    set({ selectedAnnotationIds: newSet, selectedAnnotationId: primary })
  },

  clearMultiSelection: () => set({ selectedAnnotationIds: new Set(), selectedAnnotationId: null }),

  clearPage: (pageNum) => {
    const state = get()
    const current = state.annotations[pageNum] || []
    if (current.length === 0) return
    const undoEntry: HistoryEntry = { pageNum, annotations: [...current] }
    set({
      annotations: { ...state.annotations, [pageNum]: [] },
      undoStack: [...state.undoStack, undoEntry],
      redoStack: [],
      selectedAnnotationId: null,
    })
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return
    const entry = state.undoStack[state.undoStack.length - 1]
    const currentAnnotations = state.annotations[entry.pageNum] || []
    const redoEntry: HistoryEntry = { pageNum: entry.pageNum, annotations: [...currentAnnotations] }
    set({
      annotations: { ...state.annotations, [entry.pageNum]: entry.annotations },
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, redoEntry],
      selectedAnnotationId: null,
      currentPage: entry.pageNum,
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const entry = state.redoStack[state.redoStack.length - 1]
    const currentAnnotations = state.annotations[entry.pageNum] || []
    const undoEntry: HistoryEntry = { pageNum: entry.pageNum, annotations: [...currentAnnotations] }
    set({
      annotations: { ...state.annotations, [entry.pageNum]: entry.annotations },
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, undoEntry],
      selectedAnnotationId: null,
      currentPage: entry.pageNum,
    })
  },

  setProjectId: (id) => set({ projectId: id }),

  setProjectName: (name) => set({ projectName: name }),

  setEditorMode: (mode) => set({ editorMode: mode, selectedPages: new Set() }),

  togglePageSelection: (pageNum) => {
    const pages = new Set(get().selectedPages)
    if (pages.has(pageNum)) pages.delete(pageNum)
    else pages.add(pageNum)
    set({ selectedPages: pages })
  },

  selectAllPages: () => {
    const pages = new Set<number>()
    for (let i = 1; i <= get().totalPages; i++) pages.add(i)
    set({ selectedPages: pages })
  },

  clearPageSelection: () => set({ selectedPages: new Set() }),

  applyPageOperation: (newPdfBytes, newTotalPages, newAnnotations) => {
    const state = get()
    const undoEntry = {
      pdfBytes: state.pdfBytes!,
      totalPages: state.totalPages,
      annotations: state.annotations,
    }
    set({
      pdfBytes: newPdfBytes,
      totalPages: newTotalPages,
      annotations: newAnnotations,
      currentPage: Math.min(state.currentPage, newTotalPages) || 1,
      selectedPages: new Set(),
      undoStack: [],
      redoStack: [],
      selectedAnnotationId: null,
      // Limit undo stack by total memory: ~50MB max
      pageUndoStack: (() => {
        const stack = [...state.pageUndoStack, undoEntry]
        const MB = 1024 * 1024
        let totalSize = 0
        const limited: typeof stack = []
        for (let i = stack.length - 1; i >= 0; i--) {
          totalSize += stack[i].pdfBytes.length
          if (totalSize > 50 * MB) break
          limited.unshift(stack[i])
        }
        return limited.length > 0 ? limited : [undoEntry]
      })(),
    })
  },

  undoPageOperation: () => {
    const state = get()
    if (state.pageUndoStack.length === 0) return null
    const entry = state.pageUndoStack[state.pageUndoStack.length - 1]
    set({
      pdfBytes: entry.pdfBytes,
      totalPages: entry.totalPages,
      annotations: entry.annotations,
      currentPage: Math.min(state.currentPage, entry.totalPages) || 1,
      selectedPages: new Set(),
      undoStack: [],
      redoStack: [],
      selectedAnnotationId: null,
      pageUndoStack: state.pageUndoStack.slice(0, -1),
    })
    return entry
  },

  setLoading: (loading, text = '') => set({ isLoading: loading, loadingText: text }),

  copyAnnotation: () => {
    const state = get()
    if (!state.selectedAnnotationId) return
    const anns = state.annotations[state.currentPage] || []
    const selected = anns.find((a) => a.id === state.selectedAnnotationId)
    if (selected) {
      set({ clipboardAnnotation: structuredClone(selected) })
    }
  },

  pasteAnnotation: () => {
    const state = get()
    if (!state.clipboardAnnotation) return
    const offset = 15
    const newAnn: Annotation = structuredClone(state.clipboardAnnotation)
    newAnn.id = generateId()
    const data = newAnn.data as unknown as Record<string, unknown>
    if ('x' in data && 'y' in data) {
      data.x = (data.x as number) + offset
      data.y = (data.y as number) + offset
    }
    if ('startX' in data && 'startY' in data) {
      data.startX = (data.startX as number) + offset
      data.startY = (data.startY as number) + offset
    }
    if ('endX' in data && 'endY' in data) {
      data.endX = (data.endX as number) + offset
      data.endY = (data.endY as number) + offset
    }
    if ('points' in data && Array.isArray(data.points)) {
      data.points = (data.points as { x: number; y: number }[]).map((p) => ({
        x: p.x + offset, y: p.y + offset,
      }))
    }
    // Push to undo stack
    const pageAnns = state.annotations[state.currentPage] || []
    const newAnnotations = { ...state.annotations, [state.currentPage]: [...pageAnns, newAnn] }
    set({
      annotations: newAnnotations,
      selectedAnnotationId: newAnn.id,
      undoStack: [...state.undoStack, { pageNum: state.currentPage, annotations: state.annotations[state.currentPage] || [] }],
      redoStack: [],
    })
  },

  duplicateAnnotation: () => {
    const state = get()
    if (!state.selectedAnnotationId) return
    const anns = state.annotations[state.currentPage] || []
    const selected = anns.find((a) => a.id === state.selectedAnnotationId)
    if (!selected) return
    // Copy then paste in one action
    set({ clipboardAnnotation: structuredClone(selected) })
    // Now paste
    const offset = 15
    const newAnn: Annotation = structuredClone(selected)
    newAnn.id = generateId()
    const data = newAnn.data as unknown as Record<string, unknown>
    if ('x' in data && 'y' in data) {
      data.x = (data.x as number) + offset
      data.y = (data.y as number) + offset
    }
    if ('startX' in data && 'startY' in data) {
      data.startX = (data.startX as number) + offset
      data.startY = (data.startY as number) + offset
    }
    if ('endX' in data && 'endY' in data) {
      data.endX = (data.endX as number) + offset
      data.endY = (data.endY as number) + offset
    }
    if ('points' in data && Array.isArray(data.points)) {
      data.points = (data.points as Array<{ x: number; y: number }>).map((p) => ({
        x: p.x + offset, y: p.y + offset,
      }))
    }
    const pageAnns = state.annotations[state.currentPage] || []
    const newAnnotations = { ...state.annotations, [state.currentPage]: [...pageAnns, newAnn] }
    set({
      annotations: newAnnotations,
      selectedAnnotationId: newAnn.id,
      undoStack: [...state.undoStack, { pageNum: state.currentPage, annotations: state.annotations[state.currentPage] || [] }],
      redoStack: [],
    })
  },

  resetEditor: () => set(initialState),
}))
