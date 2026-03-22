'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { drawAnnotation, drawSelectionUI, getAnnotationBounds, hitTestAnnotation, hitTestHandle } from '@/lib/pdf-renderer'
import { generateId } from '@/lib/id'
import type { Annotation, Point, RectData, ArrowData, CalloutData, PolylineData, StampData } from '@/types/annotations'

interface EditorCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy
}

export default function EditorCanvas({ pdfDoc }: EditorCanvasProps) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const store = useEditorStore()
  const {
    currentPage, scale, currentTool, maskColor, penSize, fontSize, fontFamily, highlightOpacity,
    elementOpacity, fillEnabled, fillOpacity, textBold, textUnderline, textBox,
    annotations, selectedAnnotationId,
    addAnnotation, updateAnnotation, setSelectedAnnotationId,
  } = store

  // Drawing state (local, not in store)
  const [isDrawing, setIsDrawing] = useState(false)
  const shiftKeyRef = useRef(false)
  const drawStateRef = useRef<{
    startX: number
    startY: number
    currentPath: Point[]
    dragMode: string | null
    dragStart: { x: number; y: number } | null
    origData: unknown
    calloutPending: { startX: number; startY: number; endX: number; endY: number } | null
    isActive: boolean
    composing: boolean
    polylinePoints: Point[]
  }>({
    startX: 0, startY: 0, currentPath: [],
    dragMode: null, dragStart: null, origData: null,
    calloutPending: null, isActive: false, composing: false,
    polylinePoints: [] as Point[],
  })

  // Pinch-zoom state
  const pinchRef = useRef<{
    active: boolean
    initialDist: number
    initialScale: number
    lastDist: number
  }>({ active: false, initialDist: 0, initialScale: 1, lastDist: 0 })

  // Track Shift key state
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftKeyRef.current = true }
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftKeyRef.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // Text input state
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  })
  const [textValue, setTextValue] = useState('')
  const textInputRef = useRef<HTMLTextAreaElement>(null)

  // Editing existing annotation (double-click to re-edit)
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)

  // Render PDF page
  useEffect(() => {
    const renderPage = async () => {
      const pdfCanvas = pdfCanvasRef.current
      if (!pdfCanvas || !pdfDoc) return

      const page = await pdfDoc.getPage(currentPage)
      const viewport = page.getViewport({ scale })

      pdfCanvas.width = viewport.width
      pdfCanvas.height = viewport.height

      const maskCanvas = maskCanvasRef.current
      if (maskCanvas) {
        maskCanvas.width = viewport.width
        maskCanvas.height = viewport.height
      }

      const ctx = pdfCanvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport }).promise

      redrawAnnotations()
    }

    renderPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale])

  // Redraw annotations when they change
  useEffect(() => {
    redrawAnnotations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, selectedAnnotationId, currentPage])

  const redrawAnnotations = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const ctx = maskCanvas.getContext('2d')!
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)

    const pageAnnotations = annotations[currentPage] || []

    // Draw annotations in PDF space, scaled to canvas
    ctx.save()
    ctx.scale(scale, scale)
    for (const ann of pageAnnotations) {
      drawAnnotation(ctx, ann)
    }
    ctx.restore()

    // Draw selection UI in canvas space (constant handle size)
    if (selectedAnnotationId) {
      const selected = pageAnnotations.find((a) => a.id === selectedAnnotationId)
      if (selected) {
        const bounds = getAnnotationBounds(selected)
        if (bounds) {
          const scaledBounds = {
            x: bounds.x * scale,
            y: bounds.y * scale,
            w: bounds.w * scale,
            h: bounds.h * scale,
          }
          drawSelectionUI(ctx, scaledBounds, selected.rotation, selected, scale)
        }
      }
    }
  }, [annotations, currentPage, selectedAnnotationId, scale])

  // Get position relative to canvas
  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = maskCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? (e as React.TouchEvent).changedTouches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? (e as React.TouchEvent).changedTouches[0].clientY : e.clientY
    // Normalize to PDF space (scale=1.0)
    return {
      x: ((clientX - rect.left) * scaleX) / scale,
      y: ((clientY - rect.top) * scaleY) / scale,
    }
  }, [scale])

  // Add annotation and auto-switch to select mode with the new annotation selected
  const addAndSelect = useCallback((pageNum: number, ann: Annotation) => {
    addAnnotation(pageNum, ann)
    store.setCurrentTool('select')
    setSelectedAnnotationId(ann.id)
  }, [addAnnotation, store, setSelectedAnnotationId])

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault()
    const pos = getPos(e)
    const ds = drawStateRef.current
    const pageAnns = annotations[currentPage] || []

    // Handle stamp leg placement mode
    if (stampLegModeRef.current && selectedAnnotationId) {
      const selected = pageAnns.find((a) => a.id === selectedAnnotationId)
      if (selected && selected.type === 'stamp') {
        updateAnnotation(currentPage, selected.id, {
          data: { ...selected.data, legX: pos.x, legY: pos.y } as unknown as typeof selected.data,
        })
        stampLegModeRef.current = false
        redrawAnnotations()
        return
      }
    }

    if (currentTool === 'select') {
      // Check handle hit on selected annotation - including stamp leg drag
      if (selectedAnnotationId) {
        const selected = pageAnns.find((a) => a.id === selectedAnnotationId)
        if (selected) {
          const bounds = getAnnotationBounds(selected)
          if (bounds) {
            const handle = hitTestHandle(pos.x, pos.y, bounds, selected.rotation, selected, scale)
            if (handle) {
              ds.dragMode = handle
              ds.dragStart = pos
              if (handle.startsWith('polyline-point-')) {
                const pd = selected.data as PolylineData
                ds.origData = JSON.parse(JSON.stringify(pd.points))
              } else if (handle === 'stamp-leg') {
                const sd = selected.data as StampData
                ds.origData = { legX: sd.legX, legY: sd.legY }
              } else if (handle === 'callout-start') {
                const d = selected.data as CalloutData
                ds.origData = { startX: d.startX, startY: d.startY }
              } else if (handle === 'callout-end') {
                const d = selected.data as CalloutData
                ds.origData = { endX: d.endX, endY: d.endY }
              } else if (handle === 'rotate') {
                ds.origData = selected.rotation || 0
              } else if (handle.startsWith('resize-') && !['rect', 'highlight', 'circle', 'stamp', 'shape-rect'].includes(selected.type)) {
                // For non-rect types, store both data and bounds for proportional resize
                ds.origData = { data: JSON.parse(JSON.stringify(selected.data)), bounds: { ...bounds } }
              } else {
                ds.origData = JSON.parse(JSON.stringify(selected.data))
              }
              setIsDrawing(true)
              return
            }
          }
          if (hitTestAnnotation(pos.x, pos.y, selected)) {
            ds.dragMode = 'move'
            ds.dragStart = pos
            ds.origData = JSON.parse(JSON.stringify(selected.data))
            setIsDrawing(true)
            return
          }
        }
      }

      // Try to select a new annotation (topmost first)
      for (let i = pageAnns.length - 1; i >= 0; i--) {
        if (hitTestAnnotation(pos.x, pos.y, pageAnns[i])) {
          setSelectedAnnotationId(pageAnns[i].id)
          ds.dragMode = 'move'
          ds.dragStart = pos
          ds.origData = JSON.parse(JSON.stringify(pageAnns[i].data))
          setIsDrawing(true)
          return
        }
      }

      setSelectedAnnotationId(null)
      return
    }

    if (currentTool === 'text') {
      // Show text input at click position (pos is in PDF space, convert to display)
      const canvas = maskCanvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const dispX = pos.x * scale * (rect.width / canvas.width)
      const dispY = pos.y * scale * (rect.height / canvas.height)
      setTextInput({ x: dispX, y: dispY, visible: true })
      setTextValue('')
      setEditingAnnotationId(null)
      setTimeout(() => textInputRef.current?.focus(), 50)
      return
    }

    if (currentTool === 'stamp') {
      const ps = pendingStampRef.current
      if (ps) {
        const sw = 160 / scale
        const sh = 64 / scale
        addAndSelect(currentPage, {
          id: generateId(),
          type: 'stamp',
          color: ps.color,
          data: {
            x: pos.x - sw / 2,
            y: pos.y - sh / 2,
            w: sw,
            h: sh,
            stampId: ps.stampId,
            label: ps.label,
          },
        })
        pendingStampRef.current = null
      }
      return
    }

    if (currentTool === 'polyline') {
      // Add point on each click; double-click will commit
      let px = pos.x, py = pos.y
      // Shift: snap to horizontal or vertical from last point
      if (shiftKeyRef.current && ds.polylinePoints.length > 0) {
        const last = ds.polylinePoints[ds.polylinePoints.length - 1]
        if (Math.abs(pos.x - last.x) >= Math.abs(pos.y - last.y)) {
          py = last.y // horizontal
        } else {
          px = last.x // vertical
        }
      }
      ds.polylinePoints.push({ x: px, y: py })
      return
    }

    ds.isActive = true
    setIsDrawing(true)
    ds.startX = pos.x
    ds.startY = pos.y

    if (currentTool === 'pen') {
      ds.currentPath = [{ x: pos.x, y: pos.y }]
    }
  }, [currentTool, getPos, annotations, currentPage, selectedAnnotationId, setSelectedAnnotationId])

  // Double-click to re-edit text/callout or commit polyline
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Commit polyline on double-click
    if (currentTool === 'polyline') {
      const ds = drawStateRef.current
      // Remove duplicate last point (mouseDown already added it)
      if (ds.polylinePoints.length >= 3) {
        const last = ds.polylinePoints[ds.polylinePoints.length - 1]
        const prev = ds.polylinePoints[ds.polylinePoints.length - 2]
        if (Math.hypot(last.x - prev.x, last.y - prev.y) < 3) {
          ds.polylinePoints.pop()
        }
      }
      if (ds.polylinePoints.length >= 2) {
        addAndSelect(currentPage, {
          id: generateId(),
          type: 'polyline',
          color: maskColor,
          size: penSize,
          data: {
            points: [...ds.polylinePoints],
            arrowStart: false,
            arrowEnd: false,
          },
          opacity: elementOpacity, fillEnabled, fillOpacity,
        })
      }
      ds.polylinePoints = []
      redrawAnnotations()
      return
    }

    if (currentTool !== 'select') return
    const pos = getPos(e)
    const pageAnns = annotations[currentPage] || []

    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i]
      if (!hitTestAnnotation(pos.x, pos.y, ann)) continue

      if (ann.type === 'text') {
        const canvas = maskCanvasRef.current!
        const rect = canvas.getBoundingClientRect()
        const dispX = ann.data.x * scale * (rect.width / canvas.width)
        const dispY = ann.data.y * scale * (rect.height / canvas.height)
        setEditingAnnotationId(ann.id)
        setTextInput({ x: dispX, y: dispY, visible: true })
        setTextValue(ann.data.text)
        setTimeout(() => textInputRef.current?.focus(), 50)
        return
      }

      if (ann.type === 'callout') {
        const d = ann.data as CalloutData
        const canvas = maskCanvasRef.current!
        const rect = canvas.getBoundingClientRect()
        const dispX = d.endX * scale * (rect.width / canvas.width)
        const dispY = d.endY * scale * (rect.height / canvas.height) - 20
        setEditingAnnotationId(ann.id)
        drawStateRef.current.calloutPending = null
        setTextInput({ x: dispX, y: dispY, visible: true })
        setTextValue(d.text)
        setTimeout(() => textInputRef.current?.focus(), 50)
        return
      }
    }
  }, [currentTool, getPos, annotations, currentPage])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault()

    // Polyline preview (doesn't use isDrawing)
    if (currentTool === 'polyline' && drawStateRef.current.polylinePoints.length > 0) {
      const pos = getPos(e)
      const ds = drawStateRef.current
      const maskCanvas = maskCanvasRef.current
      if (!maskCanvas) return
      const ctx = maskCanvas.getContext('2d')!
      redrawAnnotations()
      // Draw existing segments in PDF space
      ctx.save()
      ctx.scale(scale, scale)
      ctx.strokeStyle = maskColor
      ctx.lineWidth = penSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(ds.polylinePoints[0].x, ds.polylinePoints[0].y)
      for (let i = 1; i < ds.polylinePoints.length; i++) {
        ctx.lineTo(ds.polylinePoints[i].x, ds.polylinePoints[i].y)
      }
      // Preview fill when fillEnabled and 3+ points (closeable)
      if (fillEnabled && ds.polylinePoints.length >= 3) {
        const savedAlpha = ctx.globalAlpha
        ctx.globalAlpha = (fillOpacity ?? 0.3)
        ctx.fillStyle = maskColor
        ctx.fill()
        ctx.globalAlpha = savedAlpha
      }
      ctx.stroke()
      // Preview next segment (dashed), with Shift snap
      const last = ds.polylinePoints[ds.polylinePoints.length - 1]
      let previewX = pos.x, previewY = pos.y
      if (shiftKeyRef.current) {
        if (Math.abs(pos.x - last.x) >= Math.abs(pos.y - last.y)) {
          previewY = last.y
        } else {
          previewX = last.x
        }
      }
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(previewX, previewY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
      return
    }

    if (!isDrawing && !drawStateRef.current.isActive) return

    const pos = getPos(e)
    const ds = drawStateRef.current
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const ctx = maskCanvas.getContext('2d')!

    if (currentTool === 'select' && ds.dragMode && ds.dragStart && selectedAnnotationId) {
      const dx = pos.x - ds.dragStart.x
      const dy = pos.y - ds.dragStart.y
      const pageAnns = annotations[currentPage] || []
      const ann = pageAnns.find((a) => a.id === selectedAnnotationId)
      if (!ann) return

      const orig = ds.origData

      if (ds.dragMode.startsWith('polyline-point-')) {
        if (ann.type === 'polyline') {
          const idx = parseInt(ds.dragMode.split('-')[2])
          const origPts = orig as unknown as Point[]
          const newPoints = origPts.map((p, i) =>
            i === idx ? { x: p.x + dx, y: p.y + dy } : { ...p }
          )
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, points: newPoints } as unknown as typeof ann.data,
          })
        }
      } else if (ds.dragMode === 'stamp-leg') {
        if (ann.type === 'stamp') {
          const o = orig as { legX: number; legY: number }
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, legX: o.legX + dx, legY: o.legY + dy } as unknown as typeof ann.data,
          })
        }
      } else if (ds.dragMode === 'callout-start') {
        if (ann.type === 'callout') {
          const o = orig as { startX: number; startY: number }
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, startX: o.startX + dx, startY: o.startY + dy } as unknown as typeof ann.data,
          })
        }
      } else if (ds.dragMode === 'callout-end') {
        if (ann.type === 'callout') {
          const o = orig as { endX: number; endY: number }
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, endX: o.endX + dx, endY: o.endY + dy } as unknown as typeof ann.data,
          })
        }
      } else if (ds.dragMode === 'move') {
        if (ann.type === 'stamp') {
          // Move stamp body + leg together
          const o = orig as unknown as StampData
          const updatedData: Record<string, unknown> = { ...ann.data, x: o.x + dx, y: o.y + dy }
          if (o.legX != null && o.legY != null) {
            updatedData.legX = o.legX + dx
            updatedData.legY = o.legY + dy
          }
          updateAnnotation(currentPage, ann.id, {
            data: updatedData as unknown as typeof ann.data,
          })
        } else if (ann.type === 'rect' || ann.type === 'highlight' || ann.type === 'circle' || ann.type === 'shape-rect') {
          const o = orig as unknown as RectData
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, x: o.x + dx, y: o.y + dy } as unknown as typeof ann.data,
          })
        } else if (ann.type === 'text') {
          const o = orig as unknown as { x: number; y: number }
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, x: o.x + dx, y: o.y + dy } as unknown as typeof ann.data,
          })
        } else if (ann.type === 'arrow') {
          const o = orig as unknown as ArrowData
          updateAnnotation(currentPage, ann.id, {
            data: { startX: o.startX + dx, startY: o.startY + dy, endX: o.endX + dx, endY: o.endY + dy },
          })
        } else if (ann.type === 'callout') {
          const o = orig as unknown as CalloutData
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, startX: o.startX + dx, startY: o.startY + dy, endX: o.endX + dx, endY: o.endY + dy } as unknown as typeof ann.data,
          })
        } else if (ann.type === 'pen') {
          const origPts = orig as unknown as Point[]
          updateAnnotation(currentPage, ann.id, {
            data: origPts.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          })
        } else if (ann.type === 'polyline') {
          const o = orig as unknown as PolylineData
          updateAnnotation(currentPage, ann.id, {
            data: { ...o, points: o.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) },
          })
        }
      } else if (ds.dragMode === 'rotate') {
        const bounds = getAnnotationBounds(ann)
        if (bounds) {
          const cx = bounds.x + bounds.w / 2
          const cy = bounds.y + bounds.h / 2
          const angle = Math.atan2(pos.y - cy, pos.x - cx) - Math.atan2(ds.dragStart.y - cy, ds.dragStart.x - cx)
          updateAnnotation(currentPage, ann.id, {
            rotation: ((orig as number) + angle) % (Math.PI * 2),
          })
        }
      } else if (ds.dragMode.startsWith('resize-')) {
        if (ann.type === 'rect' || ann.type === 'highlight' || ann.type === 'circle' || ann.type === 'stamp' || ann.type === 'shape-rect') {
          const o = orig as unknown as RectData
          let nx = o.x, ny = o.y, nw = o.w, nh = o.h
          const mode = ds.dragMode
          // Horizontal: w (left edge) or e (right edge)
          if (mode === 'resize-w' || mode === 'resize-nw' || mode === 'resize-sw') { nx = o.x + dx; nw = o.w - dx }
          if (mode === 'resize-e' || mode === 'resize-ne' || mode === 'resize-se') { nw = o.w + dx }
          // Vertical: n (top edge) or s (bottom edge)
          if (mode === 'resize-n' || mode === 'resize-ne' || mode === 'resize-nw') { ny = o.y + dy; nh = o.h - dy }
          if (mode === 'resize-s' || mode === 'resize-se' || mode === 'resize-sw') { nh = o.h + dy }
          if (nw < 10) nw = 10
          if (nh < 10) nh = 10
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, x: nx, y: ny, w: nw, h: nh } as unknown as typeof ann.data,
          })
        } else if (ann.type === 'arrow') {
          // Scale arrow endpoints based on bounds resize
          const o = orig as unknown as { data: ArrowData; bounds: RectData }
          const ob = o.bounds
          if (!ob) return // safety guard
          let nx = ob.x, ny = ob.y, nw = ob.w, nh = ob.h
          if (ds.dragMode.includes('w')) { nx = ob.x + dx; nw = ob.w - dx }
          if (ds.dragMode.includes('e') && !ds.dragMode.includes('w')) { nw = ob.w + dx }
          if (ds.dragMode === 'resize-ne' || ds.dragMode === 'resize-nw') { ny = ob.y + dy; nh = ob.h - dy }
          if (ds.dragMode === 'resize-se' || ds.dragMode === 'resize-sw') { nh = ob.h + dy }
          if (nw < 10) nw = 10
          if (nh < 10) nh = 10
          const sx = nw / ob.w, sy = nh / ob.h
          updateAnnotation(currentPage, ann.id, {
            data: {
              startX: nx + (o.data.startX - ob.x) * sx,
              startY: ny + (o.data.startY - ob.y) * sy,
              endX: nx + (o.data.endX - ob.x) * sx,
              endY: ny + (o.data.endY - ob.y) * sy,
            },
          })
        } else if (ann.type === 'callout') {
          const o = orig as unknown as { data: CalloutData; bounds: RectData }
          const ob = o.bounds
          if (!ob) return // safety guard
          let nx = ob.x, ny = ob.y, nw = ob.w, nh = ob.h
          if (ds.dragMode.includes('w')) { nx = ob.x + dx; nw = ob.w - dx }
          if (ds.dragMode.includes('e') && !ds.dragMode.includes('w')) { nw = ob.w + dx }
          if (ds.dragMode === 'resize-ne' || ds.dragMode === 'resize-nw') { ny = ob.y + dy; nh = ob.h - dy }
          if (ds.dragMode === 'resize-se' || ds.dragMode === 'resize-sw') { nh = ob.h + dy }
          if (nw < 10) nw = 10
          if (nh < 10) nh = 10
          const sx = nw / ob.w, sy = nh / ob.h
          updateAnnotation(currentPage, ann.id, {
            data: {
              ...ann.data,
              startX: nx + (o.data.startX - ob.x) * sx,
              startY: ny + (o.data.startY - ob.y) * sy,
              endX: nx + (o.data.endX - ob.x) * sx,
              endY: ny + (o.data.endY - ob.y) * sy,
            } as unknown as typeof ann.data,
          })
        } else if (ann.type === 'pen') {
          const o = orig as unknown as { data: Point[]; bounds: RectData }
          const ob = o.bounds
          if (!ob) return // safety guard
          let nx = ob.x, ny = ob.y, nw = ob.w, nh = ob.h
          if (ds.dragMode.includes('w')) { nx = ob.x + dx; nw = ob.w - dx }
          if (ds.dragMode.includes('e') && !ds.dragMode.includes('w')) { nw = ob.w + dx }
          if (ds.dragMode === 'resize-ne' || ds.dragMode === 'resize-nw') { ny = ob.y + dy; nh = ob.h - dy }
          if (ds.dragMode === 'resize-se' || ds.dragMode === 'resize-sw') { nh = ob.h + dy }
          if (nw < 10) nw = 10
          if (nh < 10) nh = 10
          const sx = nw / ob.w, sy = nh / ob.h
          updateAnnotation(currentPage, ann.id, {
            data: o.data.map((p) => ({
              x: nx + (p.x - ob.x) * sx,
              y: ny + (p.y - ob.y) * sy,
            })),
          })
        } else if (ann.type === 'polyline') {
          const o = orig as unknown as { data: PolylineData; bounds: RectData }
          const ob = o.bounds
          if (!ob) return // safety guard
          let nx = ob.x, ny = ob.y, nw = ob.w, nh = ob.h
          if (ds.dragMode.includes('w')) { nx = ob.x + dx; nw = ob.w - dx }
          if (ds.dragMode.includes('e') && !ds.dragMode.includes('w')) { nw = ob.w + dx }
          if (ds.dragMode === 'resize-ne' || ds.dragMode === 'resize-nw') { ny = ob.y + dy; nh = ob.h - dy }
          if (ds.dragMode === 'resize-se' || ds.dragMode === 'resize-sw') { nh = ob.h + dy }
          if (nw < 10) nw = 10
          if (nh < 10) nh = 10
          const sx = nw / ob.w, sy = nh / ob.h
          updateAnnotation(currentPage, ann.id, {
            data: {
              ...o.data,
              points: o.data.points.map((p) => ({
                x: nx + (p.x - ob.x) * sx,
                y: ny + (p.y - ob.y) * sy,
              })),
            },
          })
        } else if (ann.type === 'text') {
          const o = orig as unknown as { data: { x: number; y: number; fontSize: number }; bounds: RectData }
          const ob = o.bounds
          if (!ob) return // safety guard
          // Scale fontSize based on horizontal resize
          let nw = ob.w
          if (ds.dragMode.includes('w')) { nw = ob.w - dx }
          if (ds.dragMode.includes('e') && !ds.dragMode.includes('w')) { nw = ob.w + dx }
          if (nw < 20) nw = 20
          const sx = nw / ob.w
          const newFontSize = Math.max(1, Math.min(100, Math.round(o.data.fontSize * sx)))
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, fontSize: newFontSize } as unknown as typeof ann.data,
          })
        }
      }
      return
    }

    // Drawing tools preview
    redrawAnnotations()

    // All preview drawing in PDF space
    ctx.save()
    ctx.scale(scale, scale)

    if (currentTool === 'rect') {
      ctx.save()
      ctx.fillStyle = maskColor
      ctx.globalAlpha = 0.5
      const x = Math.min(ds.startX, pos.x)
      const y = Math.min(ds.startY, pos.y)
      const w = Math.abs(pos.x - ds.startX)
      const h = Math.abs(pos.y - ds.startY)
      ctx.fillRect(x, y, w, h)
      ctx.restore()
    } else if (currentTool === 'highlight') {
      ctx.save()
      ctx.fillStyle = maskColor
      ctx.globalAlpha = highlightOpacity
      let hx = Math.min(ds.startX, pos.x)
      let hy = Math.min(ds.startY, pos.y)
      let hw = Math.abs(pos.x - ds.startX)
      let hh = Math.abs(pos.y - ds.startY)
      if (shiftKeyRef.current) {
        if (hw >= hh) {
          hy = ds.startY
          hh = penSize > 1 ? penSize * 2 : 20
          hy -= hh / 2
        } else {
          hx = ds.startX
          hw = penSize > 1 ? penSize * 2 : 20
          hx -= hw / 2
        }
      }
      ctx.fillRect(hx, hy, hw, hh)
      ctx.restore()
    } else if (currentTool === 'pen') {
      ds.currentPath.push(pos)
      ctx.save()
      ctx.strokeStyle = maskColor
      ctx.lineWidth = penSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(ds.currentPath[0].x, ds.currentPath[0].y)
      for (let i = 1; i < ds.currentPath.length; i++) {
        ctx.lineTo(ds.currentPath[i].x, ds.currentPath[i].y)
      }
      ctx.stroke()
      ctx.restore()
    } else if (currentTool === 'callout') {
      ctx.save()
      // Arrow line
      ctx.strokeStyle = maskColor
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(ds.startX, ds.startY)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      // Arrowhead at start
      const angle = Math.atan2(ds.startY - pos.y, ds.startX - pos.x)
      const headLen = 10
      ctx.fillStyle = maskColor
      ctx.beginPath()
      ctx.moveTo(ds.startX, ds.startY)
      ctx.lineTo(ds.startX - headLen * Math.cos(angle - Math.PI / 6), ds.startY - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(ds.startX - headLen * Math.cos(angle + Math.PI / 6), ds.startY - headLen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
      // Text box preview
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = maskColor
      ctx.lineWidth = 1.5
      ctx.strokeRect(pos.x, pos.y - 20, 120, 40)
      ctx.setLineDash([])
      ctx.restore()
    } else if (currentTool === 'arrow') {
      ctx.save()
      ctx.strokeStyle = maskColor
      ctx.lineWidth = penSize
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(ds.startX, ds.startY)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      const angle = Math.atan2(pos.y - ds.startY, pos.x - ds.startX)
      const headLen = Math.max(12, penSize * 4)
      ctx.fillStyle = maskColor
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else if (currentTool === 'shape-rect') {
      ctx.save()
      ctx.strokeStyle = maskColor
      ctx.lineWidth = penSize
      const x = Math.min(ds.startX, pos.x)
      const y = Math.min(ds.startY, pos.y)
      const w = Math.abs(pos.x - ds.startX)
      const h = Math.abs(pos.y - ds.startY)
      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    } else if (currentTool === 'circle') {
      ctx.save()
      ctx.strokeStyle = maskColor
      ctx.lineWidth = penSize
      let x = Math.min(ds.startX, pos.x)
      let y = Math.min(ds.startY, pos.y)
      let w = Math.abs(pos.x - ds.startX)
      let h = Math.abs(pos.y - ds.startY)
      if (shiftKeyRef.current) {
        const side = Math.min(w, h)
        x = ds.startX < pos.x ? ds.startX : ds.startX - side
        y = ds.startY < pos.y ? ds.startY : ds.startY - side
        w = side
        h = side
      }
      if (w > 2 && h > 2) {
        ctx.beginPath()
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }

    ctx.restore() // End PDF-space preview scale
  }, [isDrawing, currentTool, getPos, maskColor, penSize, highlightOpacity, scale, annotations, currentPage, selectedAnnotationId, updateAnnotation, redrawAnnotations])

  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault()

    const ds = drawStateRef.current

    if (currentTool === 'select') {
      ds.dragMode = null
      ds.dragStart = null
      ds.origData = null
      ds.isActive = false
      setIsDrawing(false)
      return
    }

    if (!ds.isActive) return
    ds.isActive = false
    setIsDrawing(false)

    const pos = getPos(e)

    if (currentTool === 'rect') {
      const x = Math.min(ds.startX, pos.x)
      const y = Math.min(ds.startY, pos.y)
      const w = Math.abs(pos.x - ds.startX)
      const h = Math.abs(pos.y - ds.startY)
      if (w > 2 && h > 2) {
        addAndSelect(currentPage, {
          id: generateId(), type: 'rect', color: maskColor,
          data: { x, y, w, h }, opacity: elementOpacity,
        })
      }
    } else if (currentTool === 'highlight') {
      let hx = Math.min(ds.startX, pos.x)
      let hy = Math.min(ds.startY, pos.y)
      let hw = Math.abs(pos.x - ds.startX)
      let hh = Math.abs(pos.y - ds.startY)
      // Shift: constrain to horizontal or vertical strip
      if (shiftKeyRef.current) {
        if (hw >= hh) {
          // Horizontal strip: fix y to start, use full width
          hy = ds.startY
          hh = penSize > 1 ? penSize * 2 : 20
          hy -= hh / 2
        } else {
          // Vertical strip: fix x to start, use full height
          hx = ds.startX
          hw = penSize > 1 ? penSize * 2 : 20
          hx -= hw / 2
        }
      }
      if (hw > 2 && hh > 2) {
        addAndSelect(currentPage, {
          id: generateId(), type: 'highlight', color: maskColor,
          data: { x: hx, y: hy, w: hw, h: hh },
          opacity: highlightOpacity,
        })
      }
    } else if (currentTool === 'pen') {
      if (ds.currentPath.length > 1) {
        addAndSelect(currentPage, {
          id: generateId(), type: 'pen', color: maskColor,
          data: [...ds.currentPath], size: penSize,
          opacity: elementOpacity, fillEnabled, fillOpacity,
        })
      }
    } else if (currentTool === 'callout') {
      const dist = Math.hypot(pos.x - ds.startX, pos.y - ds.startY)
      let calloutCoords: { startX: number; startY: number; endX: number; endY: number }
      if (dist > 5) {
        // Dragged: use the dragged coordinates
        calloutCoords = { startX: ds.startX, startY: ds.startY, endX: pos.x, endY: pos.y }
      } else {
        // Clicked: create default arrow offset
        calloutCoords = {
          startX: pos.x, startY: pos.y,
          endX: pos.x + 80, endY: pos.y - 40,
        }
      }
      ds.calloutPending = calloutCoords
      const canvas = maskCanvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const dispX = calloutCoords.endX * scale * (rect.width / canvas.width)
      const dispY = calloutCoords.endY * scale * (rect.height / canvas.height) - 20
      setTextInput({ x: dispX, y: dispY, visible: true })
      setTextValue('')
      setEditingAnnotationId(null)
      setTimeout(() => textInputRef.current?.focus(), 50)
    } else if (currentTool === 'arrow') {
      const dist = Math.hypot(pos.x - ds.startX, pos.y - ds.startY)
      if (dist > 5) {
        addAndSelect(currentPage, {
          id: generateId(), type: 'arrow', color: maskColor, size: penSize,
          data: { startX: ds.startX, startY: ds.startY, endX: pos.x, endY: pos.y },
          opacity: elementOpacity,
        })
      }
    } else if (currentTool === 'shape-rect') {
      const x = Math.min(ds.startX, pos.x)
      const y = Math.min(ds.startY, pos.y)
      const w = Math.abs(pos.x - ds.startX)
      const h = Math.abs(pos.y - ds.startY)
      if (w > 5 && h > 5) {
        addAndSelect(currentPage, {
          id: generateId(), type: 'shape-rect', color: maskColor, size: penSize,
          data: { x, y, w, h },
          opacity: elementOpacity, fillEnabled, fillOpacity,
        })
      }
    } else if (currentTool === 'circle') {
      let x = Math.min(ds.startX, pos.x)
      let y = Math.min(ds.startY, pos.y)
      let w = Math.abs(pos.x - ds.startX)
      let h = Math.abs(pos.y - ds.startY)
      if (shiftKeyRef.current) {
        const side = Math.min(w, h)
        x = ds.startX < pos.x ? ds.startX : ds.startX - side
        y = ds.startY < pos.y ? ds.startY : ds.startY - side
        w = side
        h = side
      }
      if (w > 5 && h > 5) {
        addAndSelect(currentPage, {
          id: generateId(), type: 'circle', color: maskColor, size: penSize,
          data: { x, y, w, h },
          opacity: elementOpacity, fillEnabled, fillOpacity,
        })
      }
    }

    ds.currentPath = []
  }, [currentTool, getPos, maskColor, penSize, highlightOpacity, currentPage, addAnnotation, addAndSelect])

  // Text input commit
  const commitText = useCallback(() => {
    const ds = drawStateRef.current

    if (!textValue.trim()) {
      setTextInput((prev) => ({ ...prev, visible: false }))
      ds.calloutPending = null
      setEditingAnnotationId(null)
      return
    }

    if (editingAnnotationId) {
      // Update existing annotation
      const pageAnns = annotations[currentPage] || []
      const ann = pageAnns.find((a) => a.id === editingAnnotationId)
      if (ann) {
        if (ann.type === 'text') {
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, text: textValue, fontSize, fontFamily } as unknown as typeof ann.data,
          })
        } else if (ann.type === 'callout') {
          updateAnnotation(currentPage, ann.id, {
            data: { ...ann.data, text: textValue, fontSize, fontFamily } as unknown as typeof ann.data,
          })
        }
      }
      setEditingAnnotationId(null)
    } else if (ds.calloutPending) {
      // Commit as callout annotation
      const cp = ds.calloutPending
      addAndSelect(currentPage, {
        id: generateId(),
        type: 'callout',
        color: maskColor,
        size: penSize,
        borderRadius: 10,
        data: {
          startX: cp.startX,
          startY: cp.startY,
          endX: cp.endX,
          endY: cp.endY,
          text: textValue,
          fontSize,
          bold: textBold,
          underline: textUnderline,
          fontFamily: fontFamily,
          arrowSize: penSize,
        },
        opacity: elementOpacity,
      })
      ds.calloutPending = null
    } else {
      // Commit as text annotation (convert display coords → PDF space)
      const canvas = maskCanvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      addAndSelect(currentPage, {
        id: generateId(),
        type: 'text',
        color: maskColor,
        data: {
          x: (textInput.x * scaleX) / scale,
          y: (textInput.y * scaleY) / scale,
          text: textValue,
          fontSize,
          fontFamily,
          bold: textBold,
          underline: textUnderline,
          textBox: textBox,
        },
        opacity: elementOpacity,
      })
    }

    setTextInput((prev) => ({ ...prev, visible: false }))
    setTextValue('')
  }, [textValue, textInput, maskColor, fontSize, fontFamily, currentPage, addAnnotation, addAndSelect, editingAnnotationId, annotations, updateAnnotation])

  // Pending stamp: store stamp info, place on next canvas click
  const pendingStampRef = useRef<{ stampId: string; label: string; color: string } | null>(null)

  const setStampPending = useCallback((stampId: string, label: string, color: string) => {
    pendingStampRef.current = { stampId, label, color }
  }, [])

  // Stamp leg placement mode
  const stampLegModeRef = useRef(false)
  const enableStampLegMode = useCallback(() => {
    stampLegModeRef.current = true
  }, [])

  // Expose setStampPending and stampLegMode
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__placeStamp = setStampPending;
    (window as unknown as Record<string, unknown>).__stampLegMode = enableStampLegMode
  }, [setStampPending, enableStampLegMode])

  // Clipboard ref for copy/paste
  const clipboardRef = useRef<Annotation | null>(null)

  // Keyboard shortcuts: Esc, Copy (Ctrl+C), Paste (Ctrl+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc to cancel polyline
      if (e.key === 'Escape' && drawStateRef.current.polylinePoints.length > 0) {
        drawStateRef.current.polylinePoints = []
        redrawAnnotations()
        return
      }

      // Skip if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const isCtrl = e.ctrlKey || e.metaKey

      // Ctrl+C: Copy selected annotation
      if (isCtrl && e.key === 'c' && selectedAnnotationId) {
        const pageAnns = annotations[currentPage] || []
        const selected = pageAnns.find(a => a.id === selectedAnnotationId)
        if (selected) {
          clipboardRef.current = JSON.parse(JSON.stringify(selected))
          e.preventDefault()
        }
      }

      // Ctrl+V: Paste copied annotation with offset
      if (isCtrl && e.key === 'v' && clipboardRef.current) {
        e.preventDefault()
        const source = clipboardRef.current
        const newId = generateId()
        const offset = 20 // pixel offset so it doesn't overlap exactly

        // Deep clone and offset position
        const cloned: Annotation = JSON.parse(JSON.stringify(source))
        cloned.id = newId

        // Offset based on annotation type
        const d = cloned.data as unknown as Record<string, unknown>
        if (typeof d.x === 'number') d.x = (d.x as number) + offset
        if (typeof d.y === 'number') d.y = (d.y as number) + offset
        if (typeof d.startX === 'number') {
          d.startX = (d.startX as number) + offset
          d.endX = (d.endX as number) + offset
          d.startY = (d.startY as number) + offset
          d.endY = (d.endY as number) + offset
        }
        if (Array.isArray(d.points)) {
          d.points = (d.points as Point[]).map(p => ({ x: p.x + offset, y: p.y + offset }))
        }

        store.addAnnotation(currentPage, cloned)
        store.setSelectedAnnotationId(newId)
        redrawAnnotations()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [redrawAnnotations, selectedAnnotationId, annotations, currentPage, store])

  // Pinch-zoom handlers (2-finger touch on canvas)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      pinchRef.current = { active: true, initialDist: dist, initialScale: scale, lastDist: dist }
      return
    }
    handleMouseDown(e)
  }, [scale, handleMouseDown])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / pinchRef.current.initialDist
      const newScale = Math.min(Math.max(pinchRef.current.initialScale * ratio, 0.3), 5)
      store.setScale(newScale)
      pinchRef.current.lastDist = dist
      return
    }
    if (!pinchRef.current.active) {
      handleMouseMove(e)
    }
  }, [store, handleMouseMove])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (pinchRef.current.active) {
      if (e.touches.length < 2) {
        pinchRef.current.active = false
      }
      return
    }
    handleMouseUp(e)
  }, [handleMouseUp])

  // Wheel zoom (Ctrl+scroll or trackpad pinch)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = -e.deltaY * 0.002
        const newScale = Math.min(Math.max(scale + delta, 0.3), 5)
        store.setScale(newScale)
      }
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [scale, store])

  // Reset polylinePoints when switching tools
  useEffect(() => {
    drawStateRef.current.polylinePoints = []
  }, [currentTool])

  const cursorClass = currentTool === 'select' ? 'cursor-default' :
    currentTool === 'text' ? 'cursor-text' : 'cursor-crosshair'

  return (
    <div className="relative flex justify-center overflow-auto h-full" ref={containerRef}>
      <div className="relative inline-block shadow-lg bg-white" style={{ lineHeight: 0 }}>
        <canvas ref={pdfCanvasRef} className="block" />
        <canvas
          ref={maskCanvasRef}
          className={`absolute top-0 left-0 editor-canvas ${cursorClass}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {/* Text input overlay */}
        {textInput.visible && (
          <textarea
            ref={textInputRef}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={commitText}
            onCompositionStart={() => { drawStateRef.current.composing = true }}
            onCompositionEnd={() => { drawStateRef.current.composing = false }}
            onKeyDown={(e) => {
              // IME変換中はEnterを無視（変換確定のEnterと区別）
              if (e.nativeEvent.isComposing || drawStateRef.current.composing) return
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commitText()
              }
              if (e.key === 'Escape') {
                setTextInput((prev) => ({ ...prev, visible: false }))
                setTextValue('')
                setEditingAnnotationId(null)
                drawStateRef.current.calloutPending = null
              }
            }}
            className="absolute bg-white/80 border-2 border-indigo-500 rounded px-1 py-0.5 outline-none resize text-black z-10"
            style={{
              left: textInput.x,
              top: textInput.y,
              fontSize: `${Math.max(12, fontSize * scale * (maskCanvasRef.current ? maskCanvasRef.current.getBoundingClientRect().width / maskCanvasRef.current.width : 1))}px`,
              lineHeight: 1.4,
              color: maskColor,
              minWidth: '120px',
              minHeight: '40px',
            }}
            placeholder="テキストを入力..."
          />
        )}
      </div>
    </div>
  )
}
