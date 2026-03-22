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

export interface HistoryEntry {
  pageNum: number
  annotations: Annotation[]
}
