import { PDFDocument } from 'pdf-lib'

export async function imageToPdf(imageBytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  let image
  if (mimeType === 'image/png') {
    image = await pdfDoc.embedPng(imageBytes)
  } else if (mimeType === 'image/jpeg') {
    image = await pdfDoc.embedJpg(imageBytes)
  } else {
    // WebP: convert to JPEG via canvas first
    const jpegBytes = await convertToJpeg(imageBytes, mimeType)
    image = await pdfDoc.embedJpg(jpegBytes)
  }

  const { width, height } = image.scale(1)
  const page = pdfDoc.addPage([width, height])
  page.drawImage(image, { x: 0, y: 0, width, height })
  return pdfDoc.save()
}

async function convertToJpeg(imageBytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  const blob = new Blob([imageBytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
  URL.revokeObjectURL(url)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
