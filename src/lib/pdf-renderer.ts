import type { Annotation, Point, RectData, ArrowData, CalloutData, PolylineData, StampData, ImageData as ImageAnnotData } from '@/types/annotations'

const HANDLE_SIZE = 8

function applyDash(ctx: CanvasRenderingContext2D, style?: string, lineWidth?: number) {
  const w = lineWidth || 2
  switch (style) {
    case 'dash': ctx.setLineDash([w * 4, w * 3]); break
    case 'dot': ctx.setLineDash([w, w * 2]); break
    case 'dashdot': ctx.setLineDash([w * 4, w * 2, w, w * 2]); break
    default: ctx.setLineDash([]); break
  }
}

// Draw arrowhead with tip exactly at the endpoint.
// Returns the "base center" point so the caller can shorten the line to avoid overlap.
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  tipX: number, tipY: number,
  fromX: number, fromY: number,
  size: number, color: string,
): { baseX: number; baseY: number } {
  const angle = Math.atan2(tipY - fromY, tipX - fromX)
  const headLen = Math.max(12, size * 4)
  const p1x = tipX - headLen * Math.cos(angle - Math.PI / 6)
  const p1y = tipY - headLen * Math.sin(angle - Math.PI / 6)
  const p2x = tipX - headLen * Math.cos(angle + Math.PI / 6)
  const p2y = tipY - headLen * Math.sin(angle + Math.PI / 6)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(p1x, p1y)
  ctx.lineTo(p2x, p2y)
  ctx.closePath()
  ctx.fill()
  // base center (midpoint of the two wing points)
  return { baseX: (p1x + p2x) / 2, baseY: (p1y + p2y) / 2 }
}

// Global image cache for signature stamp images and pasted images
export const signatureImageCache = new Map<string, HTMLImageElement>()
const imageCache = new Map<string, HTMLImageElement>()

export function preloadImageCache(dataUrl: string, img: HTMLImageElement) {
  const key = dataUrl.substring(0, 100)
  imageCache.set(key, img)
}

// Clear all image caches to prevent memory leaks when switching projects
export function clearImageCaches() {
  imageCache.clear()
  signatureImageCache.clear()
}

export function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, signatureImages?: Map<string, HTMLImageElement>) {
  if (!signatureImages) signatureImages = signatureImageCache
  ctx.save()

  // Apply rotation around annotation center
  if (ann.rotation) {
    const bounds = getAnnotationBoundsRaw(ann)
    if (bounds) {
      const cx = bounds.x + bounds.w / 2
      const cy = bounds.y + bounds.h / 2
      ctx.translate(cx, cy)
      ctx.rotate(ann.rotation)
      ctx.translate(-cx, -cy)
    }
  }

  // Apply global opacity for all annotation types
  ctx.globalAlpha = ann.opacity ?? 1

  switch (ann.type) {
    case 'rect':
      ctx.fillStyle = ann.color
      ctx.fillRect(ann.data.x, ann.data.y, ann.data.w, ann.data.h)
      break

    case 'pen': {
      const pts = ann.data as Point[]
      if (pts.length === 0) break
      const penW = ann.size || 2
      ctx.strokeStyle = ann.color
      ctx.lineWidth = penW
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      applyDash(ctx, ann.dashStyle, penW)

      // Draw arrowheads and compute shortened endpoints
      let drawStart = pts[0]
      let drawEnd = pts[pts.length - 1]

      // Draw the path first, then overlay arrowheads on top
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y)
      }
      if (ann.closed) ctx.closePath()
      if (ann.fillEnabled) {
        const savedAlpha = ctx.globalAlpha
        ctx.globalAlpha = savedAlpha * (ann.fillOpacity ?? 0.3)
        ctx.fillStyle = ann.color
        ctx.fill()
        ctx.globalAlpha = savedAlpha
      }
      ctx.stroke()

      // Draw arrowheads on top of the line
      if (ann.arrowStart && pts.length >= 2) {
        ctx.setLineDash([])
        const minDist = Math.max(12, penW * 4)
        let fromPt = pts[1]
        for (let i = 1; i < pts.length; i++) {
          const dx = pts[i].x - pts[0].x, dy = pts[i].y - pts[0].y
          if (Math.hypot(dx, dy) >= minDist) { fromPt = pts[i]; break }
        }
        drawArrowhead(ctx, pts[0].x, pts[0].y, fromPt.x, fromPt.y, penW, ann.color)
      }
      if (ann.arrowEnd && pts.length >= 2) {
        const last = pts[pts.length - 1]
        const minDist = Math.max(12, penW * 4)
        let fromPt = pts[pts.length - 2]
        for (let i = pts.length - 2; i >= 0; i--) {
          const dx = pts[i].x - last.x, dy = pts[i].y - last.y
          if (Math.hypot(dx, dy) >= minDist) { fromPt = pts[i]; break }
        }
        ctx.setLineDash([])
        drawArrowhead(ctx, last.x, last.y, fromPt.x, fromPt.y, penW, ann.color)
      }
      break
    }

    case 'callout': {
      const d = ann.data as CalloutData
      const lineW = d.arrowSize || ann.size || 2
      // Arrowhead at start (pointing to the target) - draw first to get base
      const arrowBase = drawArrowhead(ctx, d.startX, d.startY, d.endX, d.endY, lineW, ann.color)
      // Arrow line from base of arrowhead to end
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = lineW
      ctx.lineCap = 'round'
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(arrowBase.baseX, arrowBase.baseY)
      ctx.lineTo(d.endX, d.endY)
      ctx.stroke()
      // Text box - position depends on arrow direction
      if (d.text) {
        const lines = d.text.split('\n')
        const fs = d.fontSize || 16
        const fontWeight = d.bold ? 'bold ' : ''
        const ff = d.fontFamily || '"Noto Sans JP", "Hiragino Sans", sans-serif'
        ctx.font = `${fontWeight}${fs}px ${ff}`
        const lineHeight = fs * 1.3
        const padding = 8
        let maxWidth = 0
        for (const line of lines) {
          const m = ctx.measureText(line)
          if (m.width > maxWidth) maxWidth = m.width
        }
        const boxW = maxWidth + padding * 2
        const boxH = lines.length * lineHeight + padding * 2
        // Box is fixed at endX (left edge), endY centered vertically
        const boxX = d.endX - boxW / 2
        const boxY = d.endY - boxH / 2
        const br = ann.borderRadius || 0
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxW, boxH, br)
        ctx.fill()
        ctx.strokeStyle = ann.color
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxW, boxH, br)
        ctx.stroke()
        ctx.fillStyle = ann.color
        ctx.textBaseline = 'top'
        // Center text vertically: total text height vs box inner height
        const totalTextH = lines.length * lineHeight - (lineHeight - fs)
        const innerH = boxH - padding * 2
        const textOffsetY = (innerH - totalTextH) / 2
        for (let i = 0; i < lines.length; i++) {
          const ly = boxY + padding + textOffsetY + i * lineHeight
          ctx.fillText(lines[i], boxX + padding, ly)
          if (d.underline) {
            const m = ctx.measureText(lines[i])
            ctx.strokeStyle = ann.color
            ctx.lineWidth = Math.max(1, fs / 14)
            ctx.beginPath()
            ctx.moveTo(boxX + padding, ly + fs)
            ctx.lineTo(boxX + padding + m.width, ly + fs)
            ctx.stroke()
          }
        }
      }
      break
    }

    case 'highlight': {
      const d = ann.data as RectData
      ctx.fillStyle = ann.color
      // opacity is already set via globalAlpha above (default 0.3 for highlights)
      ctx.fillRect(d.x, d.y, d.w, d.h)
      break
    }

    case 'text': {
      const d = ann.data
      ctx.fillStyle = ann.color
      const fontWeight = d.bold ? 'bold ' : ''
      ctx.font = `${fontWeight}${d.fontSize}px "${d.fontFamily}"`
      ctx.textBaseline = 'top'
      const lines = d.text.split('\n')
      const lineHeight = d.fontSize * 1.2

      // Text box background and border
      if (d.textBox) {
        const padding = 6
        let maxWidth = 0
        for (const line of lines) {
          const m = ctx.measureText(line)
          if (m.width > maxWidth) maxWidth = m.width
        }
        const boxW = maxWidth + padding * 2
        const boxH = lines.length * lineHeight + padding * 2
        const tbr = ann.borderRadius || 0
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.beginPath()
        ctx.roundRect(d.x - padding, d.y - padding, boxW, boxH, tbr)
        ctx.fill()
        ctx.strokeStyle = ann.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(d.x - padding, d.y - padding, boxW, boxH, tbr)
        ctx.stroke()
        ctx.fillStyle = ann.color

        // Center text vertically within box
        const totalTextH = lines.length * lineHeight - (lineHeight - d.fontSize)
        const innerH = boxH - padding * 2
        const textOffsetY = (innerH - totalTextH) / 2
        for (let i = 0; i < lines.length; i++) {
          const ly = d.y - padding + padding + textOffsetY + i * lineHeight
          ctx.fillText(lines[i], d.x, ly)
          if (d.underline) {
            const m = ctx.measureText(lines[i])
            ctx.strokeStyle = ann.color
            ctx.lineWidth = Math.max(1, d.fontSize / 14)
            ctx.beginPath()
            ctx.moveTo(d.x, ly + d.fontSize)
            ctx.lineTo(d.x + m.width, ly + d.fontSize)
            ctx.stroke()
          }
        }
      }

      if (!d.textBox) {
        for (let i = 0; i < lines.length; i++) {
          const ly = d.y + i * lineHeight
          ctx.fillText(lines[i], d.x, ly)
          if (d.underline) {
            const m = ctx.measureText(lines[i])
            ctx.strokeStyle = ann.color
            ctx.lineWidth = Math.max(1, d.fontSize / 14)
            ctx.beginPath()
            ctx.moveTo(d.x, ly + d.fontSize)
            ctx.lineTo(d.x + m.width, ly + d.fontSize)
            ctx.stroke()
          }
        }
      }
      break
    }

    case 'arrow': {
      const d = ann.data as ArrowData
      const aw = ann.size || 3
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = aw
      ctx.lineCap = 'round'
      // Arrowhead at endpoint (tip exactly at endpoint)
      const aBase = drawArrowhead(ctx, d.endX, d.endY, d.startX, d.startY, aw, ann.color)
      // Line from start to arrowhead base (so line doesn't poke through)
      ctx.beginPath()
      ctx.moveTo(d.startX, d.startY)
      ctx.lineTo(aBase.baseX, aBase.baseY)
      ctx.stroke()
      break
    }

    case 'circle': {
      const d = ann.data as RectData
      ctx.strokeStyle = ann.color
      ctx.lineWidth = ann.size || 2
      applyDash(ctx, ann.dashStyle, ann.size || 2)
      ctx.beginPath()
      const cx = d.x + d.w / 2
      const cy = d.y + d.h / 2
      const rx = Math.abs(d.w) / 2
      const ry = Math.abs(d.h) / 2
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      if (ann.fillEnabled) {
        const savedAlpha = ctx.globalAlpha
        ctx.globalAlpha = savedAlpha * (ann.fillOpacity ?? 0.3)
        ctx.fillStyle = ann.color
        ctx.fill()
        ctx.globalAlpha = savedAlpha
      }
      ctx.stroke()
      break
    }

    case 'shape-rect': {
      const d = ann.data as RectData
      const rr = ann.borderRadius || 0
      ctx.strokeStyle = ann.color
      ctx.lineWidth = ann.size || 2
      applyDash(ctx, ann.dashStyle, ann.size || 2)
      if (ann.fillEnabled) {
        const savedAlpha = ctx.globalAlpha
        ctx.globalAlpha = savedAlpha * (ann.fillOpacity ?? 0.3)
        ctx.fillStyle = ann.color
        ctx.beginPath()
        ctx.roundRect(d.x, d.y, d.w, d.h, rr)
        ctx.fill()
        ctx.globalAlpha = savedAlpha
      }
      ctx.beginPath()
      ctx.roundRect(d.x, d.y, d.w, d.h, rr)
      ctx.stroke()
      break
    }

    case 'stamp': {
      const d = ann.data as StampData
      const cx = d.x + d.w / 2
      const cy = d.y + d.h / 2
      const radius = 6
      const stampColor = ann.color || '#dc2626'

      // Make stamps slightly transparent for a lighter look
      const savedStampAlpha = ctx.globalAlpha
      ctx.globalAlpha = savedStampAlpha * 0.65

      // Draw leg/arrow if present (draw behind stamp)
      if (d.legX != null && d.legY != null) {
        // Determine which edge of stamp is closest to the leg target
        const dx = d.legX - cx
        const dy = d.legY - cy
        let edgeX: number, edgeY: number
        if (Math.abs(dx) >= Math.abs(dy)) {
          // Horizontal: left or right edge
          edgeX = dx >= 0 ? d.x + d.w : d.x
          edgeY = cy
        } else {
          // Vertical: top or bottom edge
          edgeX = cx
          edgeY = dy >= 0 ? d.y + d.h : d.y
        }
        // Line from stamp edge to target
        ctx.strokeStyle = stampColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(edgeX, edgeY)
        ctx.lineTo(d.legX, d.legY)
        ctx.stroke()
        // Arrowhead at target point
        const arrowAngle = Math.atan2(d.legY - edgeY, d.legX - edgeX)
        const headLen = 12
        ctx.fillStyle = stampColor
        ctx.beginPath()
        ctx.moveTo(d.legX, d.legY)
        ctx.lineTo(d.legX - headLen * Math.cos(arrowAngle - Math.PI / 6), d.legY - headLen * Math.sin(arrowAngle - Math.PI / 6))
        ctx.lineTo(d.legX - headLen * Math.cos(arrowAngle + Math.PI / 6), d.legY - headLen * Math.sin(arrowAngle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
      }

      // Signature stamp (multi-line + optional image)
      if (d.isSignature) {
        const baseFontSize = d.fontSize || 11
        const scaleRatio = d.origW && d.origH
          ? Math.min(d.w / d.origW, d.h / d.origH)
          : 1
        const fs = baseFontSize * scaleRatio
        const ff = d.fontFamily || '"Noto Sans JP", "Hiragino Sans", sans-serif'
        const padding = 10 * scaleRatio
        const lineHeight = fs * 1.4
        const lines = d.multiLineText ? d.multiLineText.split('\n') : []
        const hasText = lines.length > 0 && d.multiLineText?.trim()
        const imgPos = d.imagePosition || 'top'
        const showBorder = d.showBorder ?? true
        const imgScale = (d.imageScale || 100) / 100

        // White background + border
        if (showBorder) {
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.beginPath()
          ctx.roundRect(d.x, d.y, d.w, d.h, radius)
          ctx.fill()

          ctx.strokeStyle = stampColor
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.roundRect(d.x, d.y, d.w, d.h, radius)
          ctx.stroke()
        }

        // Draw image if present
        if (d.imageData && signatureImages) {
          let cachedImg = signatureImages.get(d.imageData)
          if (!cachedImg) {
            // Start loading - will render on next redraw
            const img = new Image()
            img.src = d.imageData
            img.onload = () => {
              signatureImages.set(d.imageData!, img)
              // Trigger a redraw if possible
            }
            signatureImages.set(d.imageData, null as unknown as HTMLImageElement)
          }
          if (cachedImg) {
            const imgMaxW = imgPos === 'top' ? d.w - padding * 2 : (d.w - padding * 2) * 0.4
            const imgMaxH = imgPos === 'top' ? (hasText ? d.h * 0.4 : d.h - padding * 2) : d.h - padding * 2
            const imgRatio = Math.min(imgMaxW / cachedImg.width, imgMaxH / cachedImg.height, 1)
            const drawW = cachedImg.width * imgRatio * imgScale
            const drawH = cachedImg.height * imgRatio * imgScale

            if (imgPos === 'top') {
              const imgX = d.x + (d.w - drawW) / 2
              const imgY = d.y + padding
              ctx.drawImage(cachedImg, imgX, imgY, drawW, drawH)
              // Draw text below image
              if (hasText) {
                ctx.fillStyle = stampColor
                ctx.font = `${fs}px ${ff}`
                ctx.textBaseline = 'top'
                const textStartY = imgY + drawH + padding * 0.5
                for (let i = 0; i < lines.length; i++) {
                  const lineW = ctx.measureText(lines[i]).width
                  const lineX = d.x + (d.w - lineW) / 2
                  ctx.fillText(lines[i], lineX, textStartY + i * lineHeight)
                }
              }
            } else {
              // left or right
              const isLeft = imgPos === 'left'
              const imgX = isLeft ? d.x + padding : d.x + d.w - padding - drawW
              const imgY = d.y + (d.h - drawH) / 2
              ctx.drawImage(cachedImg, imgX, imgY, drawW, drawH)
              // Draw text on the other side (clipped to remaining space)
              if (hasText) {
                ctx.fillStyle = stampColor
                ctx.font = `${fs}px ${ff}`
                ctx.textBaseline = 'top'
                const textX = isLeft ? imgX + drawW + padding * 0.5 : d.x + padding
                const textMaxW = isLeft
                  ? d.x + d.w - padding - textX
                  : imgX - padding * 0.5 - (d.x + padding)
                const totalTextH = lines.length * lineHeight
                const textStartY = d.y + (d.h - totalTextH) / 2
                ctx.save()
                ctx.beginPath()
                ctx.rect(textX, d.y, Math.max(textMaxW, 0), d.h)
                ctx.clip()
                for (let i = 0; i < lines.length; i++) {
                  ctx.fillText(lines[i], textX, textStartY + i * lineHeight)
                }
                ctx.restore()
              }
            }
          }
        } else if (hasText) {
          // Text only (no image)
          ctx.fillStyle = stampColor
          ctx.font = `${fs}px ${ff}`
          ctx.textBaseline = 'top'
          const totalTextH = lines.length * lineHeight
          const startY = d.y + (d.h - totalTextH) / 2
          for (let i = 0; i < lines.length; i++) {
            const lineW = ctx.measureText(lines[i]).width
            const lineX = d.x + (d.w - lineW) / 2
            ctx.fillText(lines[i], lineX, startY + i * lineHeight)
          }
        }

        ctx.globalAlpha = savedStampAlpha
        break
      }

      // Compass stamp (方位マーク)
      if (d.stampId === 'compass') {
        const size = Math.min(d.w, d.h)
        const r = size * 0.45
        const nr = size * 0.38 // North arrow length
        const arrowW = size * 0.12

        // Outer circle
        ctx.strokeStyle = stampColor
        ctx.lineWidth = Math.max(2, size * 0.03)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()

        // Inner circle (small)
        ctx.beginPath()
        ctx.arc(cx, cy, size * 0.05, 0, Math.PI * 2)
        ctx.fillStyle = stampColor
        ctx.fill()

        // North arrow (filled triangle - dark)
        ctx.beginPath()
        ctx.moveTo(cx, cy - nr)
        ctx.lineTo(cx - arrowW, cy)
        ctx.lineTo(cx, cy - size * 0.05)
        ctx.closePath()
        ctx.fillStyle = stampColor
        ctx.fill()

        // North arrow (right half - lighter)
        ctx.beginPath()
        ctx.moveTo(cx, cy - nr)
        ctx.lineTo(cx + arrowW, cy)
        ctx.lineTo(cx, cy - size * 0.05)
        ctx.closePath()
        ctx.fillStyle = stampColor
        ctx.globalAlpha = (ann.opacity ?? 1) * 0.4
        ctx.fill()
        ctx.globalAlpha = savedStampAlpha * 0.65

        // South arrow (outline only)
        ctx.beginPath()
        ctx.moveTo(cx, cy + nr)
        ctx.lineTo(cx - arrowW, cy)
        ctx.lineTo(cx, cy + size * 0.05)
        ctx.closePath()
        ctx.strokeStyle = stampColor
        ctx.lineWidth = Math.max(1, size * 0.02)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(cx, cy + nr)
        ctx.lineTo(cx + arrowW, cy)
        ctx.lineTo(cx, cy + size * 0.05)
        ctx.closePath()
        ctx.stroke()

        // "N" label
        const nFontSize = Math.max(10, size * 0.2)
        ctx.fillStyle = stampColor
        ctx.font = `bold ${nFontSize}px "Arial", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText('N', cx, cy - nr - size * 0.03)
        ctx.textAlign = 'start'
        ctx.textBaseline = 'alphabetic'

        ctx.globalAlpha = savedStampAlpha
        break
      }

      // Regular stamp (single-line)
      ctx.strokeStyle = stampColor
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(d.x, d.y, d.w, d.h, radius)
      ctx.stroke()
      ctx.fillStyle = stampColor
      const label = d.label || ''
      const padding = 10
      const maxTextW = d.w - padding * 2
      let textSize = Math.max(10, Math.min(d.w, d.h) * 0.55)
      ctx.font = `bold ${textSize}px "Noto Sans JP", "Hiragino Sans", sans-serif`
      while (ctx.measureText(label).width > maxTextW && textSize > 8) {
        textSize -= 1
        ctx.font = `bold ${textSize}px "Noto Sans JP", "Hiragino Sans", sans-serif`
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, cx, cy)
      ctx.textAlign = 'start'

      ctx.globalAlpha = savedStampAlpha
      break
    }

    case 'polyline': {
      const d = ann.data as PolylineData
      const pts = d.points
      if (pts.length < 2) break
      const plw = ann.size || 2
      ctx.strokeStyle = ann.color
      ctx.lineWidth = plw
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      applyDash(ctx, ann.dashStyle, plw)

      // Compute shortened start/end points if arrows are present
      let drawStart = pts[0]
      let drawEnd = pts[pts.length - 1]
      let startBase: { baseX: number; baseY: number } | null = null
      let endBase: { baseX: number; baseY: number } | null = null

      if (d.arrowStart && pts.length >= 2) {
        ctx.setLineDash([]) // arrows are always solid
        startBase = drawArrowhead(ctx, pts[0].x, pts[0].y, pts[1].x, pts[1].y, plw, ann.color)
        drawStart = { x: startBase.baseX, y: startBase.baseY }
        applyDash(ctx, ann.dashStyle, plw) // restore dash
      }
      if (d.arrowEnd && pts.length >= 2) {
        const last = pts[pts.length - 1]
        const prev = pts[pts.length - 2]
        ctx.setLineDash([])
        endBase = drawArrowhead(ctx, last.x, last.y, prev.x, prev.y, plw, ann.color)
        drawEnd = { x: endBase.baseX, y: endBase.baseY }
        applyDash(ctx, ann.dashStyle, plw)
      }

      // Draw polyline path with shortened endpoints
      ctx.beginPath()
      ctx.moveTo(drawStart.x, drawStart.y)
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.lineTo(pts[i].x, pts[i].y)
      }
      ctx.lineTo(drawEnd.x, drawEnd.y)
      if (ann.closed) ctx.closePath()

      if (ann.fillEnabled) {
        const savedAlpha = ctx.globalAlpha
        ctx.globalAlpha = savedAlpha * (ann.fillOpacity ?? 0.3)
        ctx.fillStyle = ann.color
        ctx.fill()
        ctx.globalAlpha = savedAlpha
      }
      ctx.stroke()
      break
    }

    case 'image': {
      const d = ann.data as ImageAnnotData
      if (d.imageData) {
        // Use annotation ID as primary cache key
        const key = `img_${ann.id}`
        let cachedImg = imageCache.get(key)
        if (!cachedImg || (cachedImg.src !== d.imageData && !cachedImg.complete)) {
          // Check if already cached by data URL prefix
          const dataKey = d.imageData.substring(0, 100)
          const preloaded = imageCache.get(dataKey)
          if (preloaded && preloaded.complete && preloaded.naturalWidth > 0) {
            cachedImg = preloaded
            imageCache.set(key, cachedImg)
          } else {
            const img = new Image()
            img.onload = () => {
              imageCache.set(key, img)
              window.dispatchEvent(new CustomEvent('annotation-image-loaded'))
            }
            img.src = d.imageData
            imageCache.set(key, img)
            cachedImg = img
          }
        }
        if (cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.drawImage(cachedImg, d.x, d.y, d.w, d.h)
        } else {
          // Image still loading - draw placeholder
          ctx.fillStyle = '#f0f0f0'
          ctx.fillRect(d.x, d.y, d.w, d.h)
          ctx.strokeStyle = '#ccc'
          ctx.lineWidth = 1
          ctx.strokeRect(d.x, d.y, d.w, d.h)
          ctx.fillStyle = '#999'
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('読込中...', d.x + d.w / 2, d.y + d.h / 2)
          ctx.textAlign = 'start'
          ctx.textBaseline = 'alphabetic'
        }
        // Border (thin dotted line)
        ctx.strokeStyle = '#999'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.strokeRect(d.x, d.y, d.w, d.h)
        ctx.setLineDash([])
      }
      break
    }
  }

  ctx.restore()
}

export function drawAnnotationScaled(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  scaleFactor: number
) {
  ctx.save()
  ctx.scale(scaleFactor, scaleFactor)
  drawAnnotation(ctx, ann)
  ctx.restore()
}

// Reusable canvas for text measurement
let measureCanvas: HTMLCanvasElement | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas')
  }
  return measureCanvas.getContext('2d')
}

// Raw bounds without rotation consideration (used for rotation transform origin)
function getAnnotationBoundsRaw(ann: Annotation): RectData | null {
  switch (ann.type) {
    case 'rect':
    case 'highlight':
    case 'circle':
    case 'shape-rect':
      return ann.data as RectData

    case 'stamp':
      return { x: ann.data.x, y: ann.data.y, w: ann.data.w, h: ann.data.h }

    case 'image':
      return { x: ann.data.x, y: ann.data.y, w: ann.data.w, h: ann.data.h }

    case 'text': {
      const d = ann.data
      const lines = d.text.split('\n')
      const lineHeight = d.fontSize * 1.2
      // Use canvas measureText for accurate hit testing
      const ctx = getMeasureCtx()
      let maxWidth = 0
      if (ctx) {
        const fontWeight = d.bold ? 'bold ' : ''
        ctx.font = `${fontWeight}${d.fontSize}px "${d.fontFamily}"`
        for (const line of lines) {
          const m = ctx.measureText(line)
          if (m.width > maxWidth) maxWidth = m.width
        }
      } else {
        // Fallback: approximate calculation (server-side render)
        maxWidth = Math.max(...lines.map((l) => {
          let w = 0
          for (const ch of l) {
            w += ch.charCodeAt(0) > 255 ? d.fontSize : d.fontSize * 0.6
          }
          return w
        }))
      }
      // Add small padding to make hit-testing more forgiving
      const padding = d.textBox ? 6 : 2
      return {
        x: d.x - padding,
        y: d.y - padding,
        w: maxWidth + padding * 2,
        h: lines.length * lineHeight + padding * 2,
      }
    }

    case 'pen': {
      const pts = ann.data as Point[]
      if (pts.length === 0) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of pts) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
      const pad = (ann.size || 0) / 2
      return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
    }

    case 'callout': {
      const d = ann.data as CalloutData
      let boxW = 100, boxH = 30
      if (d.text) {
        const lines = d.text.split('\n')
        const fs = d.fontSize || 16
        const lineHeight = fs * 1.3
        const padding = 8
        const maxWidth = Math.max(...lines.map((l) => {
          let w = 0
          for (const ch of l) w += ch.charCodeAt(0) > 255 ? 1.0 : 0.6
          return w
        }))
        boxW = fs * maxWidth + padding * 2
        boxH = lines.length * lineHeight + padding * 2
      }
      // Box is fixed at endX/endY center
      const boxX = d.endX - boxW / 2
      const boxY = d.endY - boxH / 2
      const minX = Math.min(d.startX, d.endX, boxX)
      const minY = Math.min(d.startY, d.endY, boxY)
      const maxX = Math.max(d.startX, d.endX, boxX + boxW)
      const maxY = Math.max(d.startY, d.endY, boxY + boxH)
      return { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 }
    }

    case 'arrow': {
      const d = ann.data as ArrowData
      return {
        x: Math.min(d.startX, d.endX) - 5,
        y: Math.min(d.startY, d.endY) - 5,
        w: Math.abs(d.endX - d.startX) + 10,
        h: Math.abs(d.endY - d.startY) + 10,
      }
    }

    case 'polyline': {
      const d = ann.data as PolylineData
      const pts = d.points
      if (pts.length === 0) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of pts) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
      const pad = (ann.size || 3) / 2
      return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
    }
  }
}

export function getAnnotationBounds(ann: Annotation): RectData | null {
  return getAnnotationBoundsRaw(ann)
}

// Rotate a point around a center
function rotatePoint(px: number, py: number, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = px - cx
  const dy = py - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

export function hitTestAnnotation(x: number, y: number, ann: Annotation): boolean {
  const b = getAnnotationBounds(ann)
  if (!b) return false
  // Reverse-rotate test point if annotation has rotation
  let tx = x, ty = y
  if (ann.rotation) {
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const p = rotatePoint(x, y, cx, cy, -ann.rotation)
    tx = p.x
    ty = p.y
  }
  return tx >= b.x && tx <= b.x + b.w && ty >= b.y && ty <= b.y + b.h
}

const ROTATION_HANDLE_OFFSET = 25

export function hitTestHandle(
  x: number,
  y: number,
  bounds: RectData,
  rotation?: number,
  ann?: Annotation,
  displayScale?: number
): string | null {
  const hs = HANDLE_SIZE / (displayScale || 1)
  const cx = bounds.x + bounds.w / 2
  const cy = bounds.y + bounds.h / 2

  // Reverse-rotate test point to match unrotated coordinate space
  let tx = x, ty = y
  if (rotation) {
    const p = rotatePoint(x, y, cx, cy, -rotation)
    tx = p.x
    ty = p.y
  }

  // Polyline: check individual vertex handles
  if (ann?.type === 'polyline') {
    const pd = ann.data as PolylineData
    for (let i = 0; i < pd.points.length; i++) {
      if (Math.hypot(tx - pd.points[i].x, ty - pd.points[i].y) < hs * 2.5) {
        return `polyline-point-${i}`
      }
    }
  }

  // Stamp: check leg handle
  if (ann?.type === 'stamp') {
    const sd = ann.data as StampData
    if (sd.legX != null && sd.legY != null) {
      if (Math.hypot(tx - sd.legX, ty - sd.legY) < hs * 2.5) {
        return 'stamp-leg'
      }
    }
  }

  // Callout: check arrow-start and box-end handles
  if (ann?.type === 'callout') {
    const d = ann.data as CalloutData
    if (Math.hypot(tx - d.startX, ty - d.startY) < hs * 2.5) {
      return 'callout-start'
    }
    if (Math.hypot(tx - d.endX, ty - d.endY) < hs * 2.5) {
      return 'callout-end'
    }
  }

  // Check rotation handle (circle above top-center)
  const rotHandleX = cx
  const rotHandleY = bounds.y - ROTATION_HANDLE_OFFSET
  if (Math.hypot(tx - rotHandleX, ty - rotHandleY) < hs * 2.5) {
    return 'rotate'
  }

  const corners = [
    { name: 'resize-nw', cx: bounds.x, cy: bounds.y },
    { name: 'resize-ne', cx: bounds.x + bounds.w, cy: bounds.y },
    { name: 'resize-sw', cx: bounds.x, cy: bounds.y + bounds.h },
    { name: 'resize-se', cx: bounds.x + bounds.w, cy: bounds.y + bounds.h },
  ]
  const hitRadius = hs * 1.5
  for (const c of corners) {
    if (Math.abs(tx - c.cx) < hitRadius && Math.abs(ty - c.cy) < hitRadius) {
      return c.name
    }
  }

  // Midpoint handles for rect-type annotations
  const rectTypes = ['rect', 'highlight', 'circle', 'stamp', 'shape-rect']
  if (ann && rectTypes.includes(ann.type)) {
    const midpoints = [
      { name: 'resize-n', cx: cx, cy: bounds.y },
      { name: 'resize-s', cx: cx, cy: bounds.y + bounds.h },
      { name: 'resize-w', cx: bounds.x, cy: cy },
      { name: 'resize-e', cx: bounds.x + bounds.w, cy: cy },
    ]
    for (const m of midpoints) {
      if (Math.abs(tx - m.cx) < hitRadius && Math.abs(ty - m.cy) < hitRadius) {
        return m.name
      }
    }
  }

  return null
}

export function drawSelectionUI(ctx: CanvasRenderingContext2D, bounds: RectData, rotation?: number, ann?: Annotation, displayScale?: number) {
  ctx.save()

  const cx = bounds.x + bounds.w / 2
  const cy = bounds.y + bounds.h / 2

  if (rotation) {
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.translate(-cx, -cy)
  }

  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 3])
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h)
  ctx.setLineDash([])

  const hs = HANDLE_SIZE
  const handles = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.w, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.h },
    { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
  ]
  for (const h of handles) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs)
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs)
  }

  // Midpoint handles for rect-type annotations
  const rectTypes = ['rect', 'highlight', 'circle', 'stamp', 'shape-rect']
  if (ann && rectTypes.includes(ann.type)) {
    const midHandles = [
      { x: cx, y: bounds.y },
      { x: cx, y: bounds.y + bounds.h },
      { x: bounds.x, y: cy },
      { x: bounds.x + bounds.w, y: cy },
    ]
    for (const m of midHandles) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(m.x - hs / 2, m.y - hs / 2, hs, hs)
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.strokeRect(m.x - hs / 2, m.y - hs / 2, hs, hs)
    }
  }

  // Rotation handle: line from top-center up, then a circle
  const rotX = cx
  const rotY = bounds.y - ROTATION_HANDLE_OFFSET
  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(cx, bounds.y)
  ctx.lineTo(rotX, rotY)
  ctx.stroke()
  // Circle handle
  ctx.beginPath()
  ctx.arc(rotX, rotY, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 2
  ctx.stroke()

  // Polyline: draw vertex handles
  const s = displayScale || 1
  if (ann?.type === 'polyline') {
    const pd = ann.data as PolylineData
    for (let i = 0; i < pd.points.length; i++) {
      const px = pd.points[i].x * s
      const py = pd.points[i].y * s
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? '#34d399' : i === pd.points.length - 1 ? '#f87171' : '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // Stamp leg: draw draggable endpoint handle (coords in PDF space → multiply by displayScale)
  if (ann?.type === 'stamp') {
    const sd = ann.data as StampData
    if (sd.legX != null && sd.legY != null) {
      const lx = sd.legX * s, ly = sd.legY * s
      ctx.setLineDash([])
      const hr = 6
      ctx.beginPath()
      ctx.moveTo(lx, ly - hr)
      ctx.lineTo(lx + hr, ly)
      ctx.lineTo(lx, ly + hr)
      ctx.lineTo(lx - hr, ly)
      ctx.closePath()
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // Callout: draw draggable handles (coords in PDF space → multiply by displayScale)
  if (ann?.type === 'callout') {
    const d = ann.data as CalloutData
    const sx1 = d.startX * s, sy1 = d.startY * s
    const ex1 = d.endX * s, ey1 = d.endY * s
    ctx.setLineDash([])
    const hr = 6
    // Arrow-start handle (yellow diamond)
    ctx.beginPath()
    ctx.moveTo(sx1, sy1 - hr)
    ctx.lineTo(sx1 + hr, sy1)
    ctx.lineTo(sx1, sy1 + hr)
    ctx.lineTo(sx1 - hr, sy1)
    ctx.closePath()
    ctx.fillStyle = '#f59e0b'
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Box-end handle (green diamond)
    ctx.beginPath()
    ctx.moveTo(ex1, ey1 - hr)
    ctx.lineTo(ex1 + hr, ey1)
    ctx.lineTo(ex1, ey1 + hr)
    ctx.lineTo(ex1 - hr, ey1)
    ctx.closePath()
    ctx.fillStyle = '#34d399'
    ctx.fill()
    ctx.strokeStyle = '#059669'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.restore()
}
