import { create } from 'zustand'
import type { Annotation, ToolType, HistoryEntry } from '@/types/annotations'

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

  // History
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]

  // UI state
  isLoading: boolean
  loadingText: string

  // Actions
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
  clearPage: (pageNum: number) => void
  undo: () => void
  redo: () => void
  setProjectId: (id: string | null) => void
  setProjectName: (name: string) => void
  setLoading: (loading: boolean, text?: string) => void
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
  currentTool: 'rect' as ToolType,
  maskColor: '#000000',
  penSize: 2,
  fontSize: 24,
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
  undoStack: [] as HistoryEntry[],
  redoStack: [] as HistoryEntry[],
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

  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),

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

  setLoading: (loading, text = '') => set({ isLoading: loading, loadingText: text }),

  resetEditor: () => set(initialState),
}))
