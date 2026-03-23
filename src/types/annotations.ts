export type ToolType = 'rect' | 'pen' | 'callout' | 'select' | 'text' | 'highlight' | 'arrow' | 'polyline' | 'circle' | 'shape-rect' | 'stamp'

export type EditorMode = 'drawing' | 'pageEditor'

export interface Point {
  x: number
  y: number
}

export interface RectData {
  x: number
  y: number
  w: number
  h: number
}

export interface TextData {
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  bold?: boolean
  underline?: boolean
  textBox?: boolean
}

export interface StampData {
  x: number
  y: number
  w: number
  h: number
  stampId: string
  label: string
  legX?: number  // Arrow/leg target X
  legY?: number  // Arrow/leg target Y
  // Signature stamp fields
  isSignature?: boolean
  multiLineText?: string  // Full multi-line text (after variable substitution)
  fontSize?: number
  fontFamily?: string
  origW?: number  // Original width at creation (for font scaling)
  origH?: number  // Original height at creation
  imageData?: string  // Base64 data URL for embedded image
  imagePosition?: 'top' | 'left' | 'right'
  imageScale?: number
  showBorder?: boolean
}

// Signature template definition (stored in IndexedDB)
export interface SignatureTemplate {
  id: string
  name: string
  template: string  // Raw text with {variables}
  variables: Record<string, string>  // variable name -> value
  fontSize: number
  fontFamily: string
  color: string
  borderStyle: 'solid' | 'double' | 'dashed' | 'ornament'
  imageData?: string  // Base64 data URL for logo/business card image
  imagePosition?: 'top' | 'left' | 'right' // Where image appears relative to text
  imageScale?: number  // Image size scale (10-200%, default 100)
  showBorder?: boolean // Whether to show border (default true)
}

export interface ArrowData {
  startX: number
  startY: number
  endX: number
  endY: number
}

export interface CalloutData {
  startX: number
  startY: number
  endX: number
  endY: number
  text: string
  fontSize: number
  bold?: boolean
  underline?: boolean
  fontFamily?: string
  arrowSize?: number
}

export interface PolylineData {
  points: Point[]
  arrowStart: boolean
  arrowEnd: boolean
}

export type AnnotationData = RectData | Point[] | TextData | StampData | ArrowData | CalloutData | PolylineData

interface BaseAnnotation {
  id: string
  color: string
  size?: number
  opacity?: number
  rotation?: number
  fillEnabled?: boolean
  fillOpacity?: number
  closed?: boolean
  dashStyle?: 'solid' | 'dash' | 'dot' | 'dashdot'
  borderRadius?: number
  arrowStart?: boolean
  arrowEnd?: boolean
}

export interface RectAnnotation extends BaseAnnotation {
  type: 'rect'
  data: RectData
}

export interface PenAnnotation extends BaseAnnotation {
  type: 'pen'
  data: Point[]
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  data: TextData
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight'
  data: RectData
  opacity: number
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow'
  data: ArrowData
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle'
  data: RectData
}

export interface ShapeRectAnnotation extends BaseAnnotation {
  type: 'shape-rect'
  data: RectData
}

export interface StampAnnotation extends BaseAnnotation {
  type: 'stamp'
  data: StampData
}

export interface CalloutAnnotation extends BaseAnnotation {
  type: 'callout'
  data: CalloutData
}

export interface PolylineAnnotation extends BaseAnnotation {
  type: 'polyline'
  data: PolylineData
}

export interface ImageData {
  x: number
  y: number
  w: number
  h: number
  imageData: string  // Base64 data URL
  origW: number      // Original width for aspect ratio
  origH: number
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image'
  data: ImageData
}

export type Annotation =
  | RectAnnotation
  | PenAnnotation
  | TextAnnotation
  | HighlightAnnotation
  | ArrowAnnotation
  | CircleAnnotation
  | ShapeRectAnnotation
  | StampAnnotation
  | CalloutAnnotation
  | PolylineAnnotation
  | ImageAnnotation

export interface HistoryEntry {
  pageNum: number
  annotations: Annotation[]
}
