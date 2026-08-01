// jscanify no publica tipos para su build de navegador (subpath "jscanify/client").
// Se usa vía import() dinámico en DocumentWizard — ver ese archivo para la API real.
declare module "jscanify/client" {
  export default class JScanify {
    constructor();
    findPaperContour(img: unknown): unknown;
    highlightPaper(image: HTMLImageElement | HTMLCanvasElement, options?: { color?: string; thickness?: number }): HTMLCanvasElement;
    extractPaper(image: HTMLImageElement | HTMLCanvasElement, resultWidth: number, resultHeight: number, cornerPoints?: unknown): HTMLCanvasElement | null;
    getCornerPoints(contour: unknown): unknown;
  }
}
