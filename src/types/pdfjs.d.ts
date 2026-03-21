// Type declarations for PDF.js loaded via CDN (pdfjsLib global)
declare namespace pdfjsLib {
  interface GlobalWorkerOptions {
    workerSrc: string
  }

  interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
  }

  interface PDFPageProxy {
    getViewport(params: { scale: number }): PDFPageViewport
    render(params: { canvasContext: CanvasRenderingContext2D; viewport: PDFPageViewport }): { promise: Promise<void> }
  }

  interface PDFPageViewport {
    width: number
    height: number
  }

  const GlobalWorkerOptions: GlobalWorkerOptions

  function getDocument(params: { data: Uint8Array }): { promise: Promise<PDFDocumentProxy> }
}

interface Window {
  pdfjsLib: typeof pdfjsLib
}
