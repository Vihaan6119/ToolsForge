import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PdfEditorAnnotation, PdfExtractedTextItem, PdfPoint, PreviewMeta } from "@/app/tools/pdf-editor/types";

let workerConfigured = false;

type MapWithUpsert = Map<unknown, unknown> & {
  getOrInsert?: (key: unknown, value: unknown) => unknown;
  getOrInsertComputed?: (key: unknown, callback: (key: unknown) => unknown) => unknown;
};

type WeakMapWithUpsert = WeakMap<object, unknown> & {
  getOrInsert?: (key: object, value: unknown) => unknown;
  getOrInsertComputed?: (key: object, callback: (key: object) => unknown) => unknown;
};

let collectionPolyfillsConfigured = false;

function ensureCollectionUpsertPolyfills() {
  if (collectionPolyfillsConfigured) {
    return;
  }

  const mapPrototype = Map.prototype as MapWithUpsert;
  const weakMapPrototype = WeakMap.prototype as WeakMapWithUpsert;

  if (!mapPrototype.getOrInsert) {
    Object.defineProperty(mapPrototype, "getOrInsert", {
      value(key: unknown, value: unknown) {
        if (!this.has(key)) {
          this.set(key, value);
        }

        return this.get(key);
      },
      configurable: true,
      writable: true,
    });
  }

  if (!mapPrototype.getOrInsertComputed) {
    Object.defineProperty(mapPrototype, "getOrInsertComputed", {
      value(key: unknown, callback: (key: unknown) => unknown) {
        if (!this.has(key)) {
          this.set(key, callback(key));
        }

        return this.get(key);
      },
      configurable: true,
      writable: true,
    });
  }

  if (!weakMapPrototype.getOrInsert) {
    Object.defineProperty(weakMapPrototype, "getOrInsert", {
      value(key: object, value: unknown) {
        if (!this.has(key)) {
          this.set(key, value);
        }

        return this.get(key);
      },
      configurable: true,
      writable: true,
    });
  }

  if (!weakMapPrototype.getOrInsertComputed) {
    Object.defineProperty(weakMapPrototype, "getOrInsertComputed", {
      value(key: object, callback: (key: object) => unknown) {
        if (!this.has(key)) {
          this.set(key, callback(key));
        }

        return this.get(key);
      },
      configurable: true,
      writable: true,
    });
  }

  collectionPolyfillsConfigured = true;
}

async function configureWorker(pdfjs: typeof import("pdfjs-dist")) {
  if (workerConfigured) {
    return;
  }

  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  workerConfigured = true;
}

export async function renderFirstPdfPage(canvas: HTMLCanvasElement, bytes: Uint8Array) {
  return renderPdfPage(canvas, bytes, 0);
}

async function loadPdfjsDocument(bytes: Uint8Array) {
  ensureCollectionUpsertPolyfills();

  const pdfjs = await import("pdfjs-dist");
  await configureWorker(pdfjs);

  const docBytes = Uint8Array.from(bytes);
  const loadingTask = pdfjs.getDocument({ data: docBytes });
  const doc = await loadingTask.promise;

  return {
    doc,
    loadingTask,
  };
}

export async function getPdfPageCount(bytes: Uint8Array) {
  const { doc, loadingTask } = await loadPdfjsDocument(bytes);

  try {
    return doc.numPages;
  } finally {
    await doc.destroy();
    loadingTask.destroy();
  }
}

export async function renderPdfPage(canvas: HTMLCanvasElement, bytes: Uint8Array, pageIndex: number) {
  const { doc, loadingTask } = await loadPdfjsDocument(bytes);
  const pageNumber = pageIndex + 1;

  try {
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const parentWidth = canvas.parentElement?.clientWidth ?? baseViewport.width;
    const scale = Math.max(0.65, Math.min(2, parentWidth / baseViewport.width));
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context is unavailable.");
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: context, viewport, canvas }).promise;

    return {
      pageIndex,
      pageWidth: baseViewport.width,
      pageHeight: baseViewport.height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    } satisfies PreviewMeta;
  } finally {
    await doc.destroy();
    loadingTask.destroy();
  }
}

interface RawTextItem {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
}

export async function extractPdfTextItems(bytes: Uint8Array): Promise<PdfExtractedTextItem[]> {
  const { doc, loadingTask } = await loadPdfjsDocument(bytes);

  try {
    const extracted: PdfExtractedTextItem[] = [];

    for (let pageIndex = 0; pageIndex < doc.numPages; pageIndex += 1) {
      const page = await doc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const rawItems = textContent.items as RawTextItem[];

      for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex += 1) {
        const item = rawItems[itemIndex];
        const text = item.str?.trim() ?? "";

        if (!text || !item.transform || item.transform.length < 6) {
          continue;
        }

        const transform = item.transform;
        const x = transform[4];
        const y = transform[5];
        const width = Math.max(3, item.width ?? Math.abs(transform[0]));
        const height = Math.max(8, item.height ?? Math.abs(transform[3]));

        const [leftTopX, leftTopY] = viewport.convertToPdfPoint(x, y - height);
        const [rightBottomX, rightBottomY] = viewport.convertToPdfPoint(x + width, y);

        const left = Math.min(leftTopX, rightBottomX);
        const right = Math.max(leftTopX, rightBottomX);
        const bottom = Math.min(leftTopY, rightBottomY);
        const top = Math.max(leftTopY, rightBottomY);

        extracted.push({
          id: `${pageIndex}:${itemIndex}:${left.toFixed(2)}:${top.toFixed(2)}`,
          pageIndex,
          text,
          point: {
            x: (left + right) / 2,
            y: (top + bottom) / 2,
          },
          box: {
            left,
            right,
            top,
            bottom,
          },
        });
      }
    }

    return extracted;
  } finally {
    await doc.destroy();
    loadingTask.destroy();
  }
}

export function getPdfPointFromMouse(
  event: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  meta: PreviewMeta,
): PdfPoint {
  const rect = canvas.getBoundingClientRect();
  const canvasX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const canvasY = ((event.clientY - rect.top) / rect.height) * canvas.height;

  return {
    x: (canvasX / meta.canvasWidth) * meta.pageWidth,
    y: meta.pageHeight - (canvasY / meta.canvasHeight) * meta.pageHeight,
  };
}

export function getOverlayPosition(point: PdfPoint, meta: PreviewMeta) {
  return {
    left: `${(point.x / meta.pageWidth) * 100}%`,
    top: `${(1 - point.y / meta.pageHeight) * 100}%`,
  };
}

export function getOverlayBoxPosition(
  box: { left: number; right: number; top: number; bottom: number },
  meta: PreviewMeta,
) {
  return {
    left: `${(box.left / meta.pageWidth) * 100}%`,
    top: `${(1 - box.top / meta.pageHeight) * 100}%`,
    width: `${((box.right - box.left) / meta.pageWidth) * 100}%`,
    height: `${((box.top - box.bottom) / meta.pageHeight) * 100}%`,
  };
}

export function getDisplayDistanceFromClick(
  event: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  point: PdfPoint,
  meta: PreviewMeta,
) {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  const pointX = (point.x / meta.pageWidth) * rect.width;
  const pointY = (1 - point.y / meta.pageHeight) * rect.height;

  return Math.hypot(clickX - pointX, clickY - pointY);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fitTextToBox(
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  text: string,
  maxWidth: number,
  maxHeight: number,
) {
  if (!text.trim()) {
    return 8;
  }

  let low = 4;
  let high = 64;
  let best = 8;

  for (let step = 0; step < 12; step += 1) {
    const size = (low + high) / 2;
    const width = font.widthOfTextAtSize(text, size);
    const height = font.heightAtSize(size, { descender: true });

    if (width <= maxWidth && height <= maxHeight) {
      best = size;
      low = size;
    } else {
      high = size;
    }
  }

  return clamp(best, 4, 64);
}

function hexChannelToUnit(value: string) {
  const numeric = Number.parseInt(value, 16);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return clamp01(numeric / 255);
}

function hexToPdfRgb(hex: string | undefined, fallback: { r: number; g: number; b: number }) {
  if (!hex) {
    return rgb(fallback.r, fallback.g, fallback.b);
  }

  const normalized = hex.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => `${channel}${channel}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    return rgb(fallback.r, fallback.g, fallback.b);
  }

  const r = hexChannelToUnit(expanded.slice(0, 2));
  const g = hexChannelToUnit(expanded.slice(2, 4));
  const b = hexChannelToUnit(expanded.slice(4, 6));

  if (r === null || g === null || b === null) {
    return rgb(fallback.r, fallback.g, fallback.b);
  }

  return rgb(r, g, b);
}

function hexToCssColor(hex: string | undefined, fallback: string) {
  if (!hex) {
    return fallback;
  }

  const normalized = hex.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => `${channel}${channel}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    return fallback;
  }

  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return fallback;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

function fitCanvasTextSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
) {
  if (!text.trim()) {
    return 8;
  }

  let low = 4;
  let high = Math.max(10, maxHeight * 2);
  let best = 8;

  for (let step = 0; step < 12; step += 1) {
    const size = (low + high) / 2;
    context.font = `${size}px "Helvetica", "Arial", sans-serif`;
    const metrics = context.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
    const descent = metrics.actualBoundingBoxDescent || size * 0.2;
    const height = ascent + descent;

    if (metrics.width <= maxWidth && height <= maxHeight) {
      best = size;
      low = size;
    } else {
      high = size;
    }
  }

  return clamp(best, 4, 64);
}

function toCanvasPoint(point: PdfPoint, pageWidth: number, pageHeight: number, canvasWidth: number, canvasHeight: number) {
  return {
    x: (point.x / pageWidth) * canvasWidth,
    y: (1 - point.y / pageHeight) * canvasHeight,
  };
}

function toCanvasRect(
  box: { left: number; right: number; top: number; bottom: number },
  pageWidth: number,
  pageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const left = (box.left / pageWidth) * canvasWidth;
  const right = (box.right / pageWidth) * canvasWidth;
  const top = (1 - box.top / pageHeight) * canvasHeight;
  const bottom = (1 - box.bottom / pageHeight) * canvasHeight;

  return {
    left: Math.min(left, right),
    top: Math.min(top, bottom),
    width: Math.max(1, Math.abs(right - left)),
    height: Math.max(1, Math.abs(bottom - top)),
  };
}

function sampleBackgroundColor(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const { width: canvasWidth, height: canvasHeight } = context.canvas;
  const band = 2;
  const gap = 1;

  const regions = [
    { x: left - gap, y: top - band - gap, w: width + gap * 2, h: band },
    { x: left - gap, y: top + height + gap, w: width + gap * 2, h: band },
    { x: left - band - gap, y: top - gap, w: band, h: height + gap * 2 },
    { x: left + width + gap, y: top - gap, w: band, h: height + gap * 2 },
  ];

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let samples = 0;

  for (const region of regions) {
    const x = Math.max(0, Math.floor(region.x));
    const y = Math.max(0, Math.floor(region.y));
    const w = Math.min(canvasWidth - x, Math.ceil(region.w));
    const h = Math.min(canvasHeight - y, Math.ceil(region.h));

    if (w <= 0 || h <= 0) {
      continue;
    }

    const data = context.getImageData(x, y, w, h).data;
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      if (alpha <= 0) {
        continue;
      }

      totalR += data[index] * alpha;
      totalG += data[index + 1] * alpha;
      totalB += data[index + 2] * alpha;
      samples += alpha;
    }
  }

  if (samples <= 0) {
    return "rgb(255, 255, 255)";
  }

  return `rgb(${Math.round(totalR / samples)}, ${Math.round(totalG / samples)}, ${Math.round(totalB / samples)})`;
}

function drawAnnotationsOnCanvas(
  context: CanvasRenderingContext2D,
  pageWidth: number,
  pageHeight: number,
  annotations: PdfEditorAnnotation[],
) {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  for (const annotation of annotations) {
    const safeText = annotation.text.trim();
    if (!safeText) {
      continue;
    }

    if (annotation.kind === "replace-text" && annotation.replaceBox) {
      const rect = toCanvasRect(annotation.replaceBox, pageWidth, pageHeight, canvasWidth, canvasHeight);
      
      // Instead of drawing a rectangle, intelligently erase and replace the text
      const textPadX = clamp(rect.width * 0.02, 0.5, 2);
      const maxTextWidth = Math.max(1, rect.width - textPadX * 2);
      const maxTextHeight = Math.max(1, rect.height * 0.9);
      const fontSize = fitCanvasTextSize(context, safeText, maxTextWidth, maxTextHeight);

      // Sample the background at multiple strategically placed points
      const bgColor = sampleSmartBackgroundColor(
        context,
        rect.left,
        rect.top,
        rect.width,
        rect.height
      );

      // Create a local image data for this region to preserve anti-aliasing
      const imgData = context.getImageData(
        Math.floor(rect.left),
        Math.floor(rect.top),
        Math.ceil(rect.width + 2),
        Math.ceil(rect.height + 2)
      );

      // Blend the background color into the region with gaussian-like fade
      const data = imgData.data;
      const w = imgData.width;
      const h = imgData.height;

      // Paint the background with proper blending
      for (let i = 0; i < data.length; i += 4) {
        const alpha = 0.92; // Blend strength (92% of background)
        data[i] = Math.round(data[i] * (1 - alpha) + bgColor.r * alpha);
        data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + bgColor.g * alpha);
        data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + bgColor.b * alpha);
        // Preserve alpha channel
      }

      context.putImageData(imgData, Math.floor(rect.left), Math.floor(rect.top));

      // Draw the replacement text with high quality
      context.save();
      context.font = `${fontSize}px "Helvetica Neue", "Helvetica", "Arial", sans-serif`;
      context.fillStyle = hexToCssColor(annotation.colorHex, "rgb(20, 27, 43)");
      context.textBaseline = "middle";
      context.textAlign = "left";
      
      // Precise text positioning in the middle of the box
      const textY = rect.top + rect.height / 2;
      const textX = rect.left + textPadX;
      
      context.fillText(safeText, textX, textY, maxTextWidth);
      context.restore();
      continue;
    }

    if (annotation.kind === "highlight") {
      // Highlight annotations with backend system
      continue;
    }

    const point = toCanvasPoint(annotation.point, pageWidth, pageHeight, canvasWidth, canvasHeight);

    context.save();
    context.font = 'bold 14px "Helvetica", "Arial", sans-serif';
    const textWidth = context.measureText(safeText).width;
    const textHeight = 14;
    const paddingX = 4;
    const paddingY = 3;

    context.fillStyle = "rgba(250, 233, 36, 0.72)";
    context.fillRect(
      point.x - paddingX,
      point.y - paddingY - textHeight,
      textWidth + paddingX * 2,
      textHeight + paddingY * 2
    );

    context.fillStyle = "rgb(20, 27, 43)";
    context.textBaseline = "top";
    context.fillText(safeText, point.x, point.y - textHeight);
    context.restore();
  }
}

function sampleSmartBackgroundColor(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  // Sample from 8 points around the text box (top-left, top-center, top-right, left, right, bottom-left, bottom-center, bottom-right)
  const margin = Math.max(3, Math.min(8, Math.min(width, height) * 0.15));
  const samplePoints = [
    // Top edge (2-3 pixels above)
    { x: left + width * 0.25, y: Math.max(0, top - margin) },
    { x: left + width * 0.5, y: Math.max(0, top - margin) },
    { x: left + width * 0.75, y: Math.max(0, top - margin) },
    // Bottom edge (2-3 pixels below)
    { x: left + width * 0.25, y: Math.min(canvasHeight - 1, top + height + margin) },
    { x: left + width * 0.5, y: Math.min(canvasHeight - 1, top + height + margin) },
    { x: left + width * 0.75, y: Math.min(canvasHeight - 1, top + height + margin) },
    // Left edge
    { x: Math.max(0, left - margin), y: top + height * 0.5 },
    // Right edge
    { x: Math.min(canvasWidth - 1, left + width + margin), y: top + height * 0.5 },
  ];

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  const pixelData = context.getImageData(0, 0, canvasWidth, canvasHeight).data;

  for (const point of samplePoints) {
    const px = Math.max(0, Math.min(canvasWidth - 1, Math.floor(point.x)));
    const py = Math.max(0, Math.min(canvasHeight - 1, Math.floor(point.y)));
    const index = (py * canvasWidth + px) * 4;

    totalR += pixelData[index];
    totalG += pixelData[index + 1];
    totalB += pixelData[index + 2];
  }

  const count = samplePoints.length || 1;
  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

async function regeneratePdfWithRasterEdits(
  originalBytes: Uint8Array,
  annotations: PdfEditorAnnotation[],
) {
  const annotationMap = new Map<number, PdfEditorAnnotation[]>();
  for (const annotation of annotations) {
    const onPage = annotationMap.get(annotation.pageIndex);
    if (onPage) {
      onPage.push(annotation);
    } else {
      annotationMap.set(annotation.pageIndex, [annotation]);
    }
  }

  const { doc, loadingTask } = await loadPdfjsDocument(originalBytes);
  const outputDoc = await PDFDocument.create();

  try {
    for (let pageIndex = 0; pageIndex < doc.numPages; pageIndex += 1) {
      const sourcePage = await doc.getPage(pageIndex + 1);
      const baseViewport = sourcePage.getViewport({ scale: 1 });
      const renderViewport = sourcePage.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context is unavailable.");
      }

      await sourcePage.render({ canvasContext: context, viewport: renderViewport, canvas }).promise;

      const pageAnnotations = annotationMap.get(pageIndex) ?? [];
      if (pageAnnotations.length > 0) {
        drawAnnotationsOnCanvas(context, baseViewport.width, baseViewport.height, pageAnnotations);
      }

      const pngDataUrl = canvas.toDataURL("image/png");
      const embeddedImage = await outputDoc.embedPng(pngDataUrl);
      const outputPage = outputDoc.addPage([baseViewport.width, baseViewport.height]);
      outputPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height,
      });
    }
  } finally {
    await doc.destroy();
    loadingTask.destroy();
  }

  return new Uint8Array(await outputDoc.save());
}

async function drawAnnotation(
  pdfDoc: PDFDocument,
  annotation: PdfEditorAnnotation,
) {
  const page = pdfDoc.getPage(annotation.pageIndex);
  const safeText = annotation.text.trim();

  if (!safeText) {
    return;
  }

  if (annotation.kind === "replace-text") {
    if (!annotation.replaceBox) {
      return;
    }

    const box = annotation.replaceBox;
    const boxWidth = Math.max(1, box.right - box.left);
    const boxHeight = Math.max(1, box.top - box.bottom);

    const maskInsetY = clamp(boxHeight * 0.08, 0.3, 1.2);
    const maskPadX = clamp(boxWidth * 0.01, 0.15, 0.8);

    page.drawRectangle({
      x: box.left - maskPadX,
      y: box.bottom + maskInsetY,
      width: boxWidth + maskPadX * 2,
      height: Math.max(1, boxHeight - maskInsetY * 2),
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const textPadX = clamp(boxWidth * 0.03, 0.5, 1.8);
    const maxTextWidth = Math.max(1, boxWidth - textPadX * 2);
    const maxTextHeight = Math.max(1, boxHeight * 0.9);
    const fontSize = fitTextToBox(font, safeText, maxTextWidth, maxTextHeight);

    const fullTextHeight = font.heightAtSize(fontSize, { descender: true });
    const ascenderHeight = font.heightAtSize(fontSize, { descender: false });
    const descenderHeight = Math.max(0, fullTextHeight - ascenderHeight);
    const baselineY = box.bottom + (boxHeight - fullTextHeight) / 2 + descenderHeight;

    page.drawText(safeText, {
      x: box.left + textPadX,
      y: baselineY,
      size: fontSize,
      font,
      color: hexToPdfRgb(annotation.colorHex, { r: 0.08, g: 0.11, b: 0.17 }),
    });

    return;
  }

  if (annotation.kind === "text") {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(safeText, {
      x: annotation.point.x,
      y: annotation.point.y,
      size: 16,
      font,
      color: hexToPdfRgb(annotation.colorHex, { r: 0.95, g: 0.97, b: 1 }),
    });

    return;
  }

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 14;
  const textWidth = font.widthOfTextAtSize(safeText, fontSize);
  const paddingX = 4;
  const paddingY = 3;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;

  page.drawRectangle({
    x: annotation.point.x - paddingX,
    y: annotation.point.y - paddingY,
    width: boxWidth,
    height: boxHeight,
    color: rgb(0.98, 0.91, 0.22),
    opacity: 0.72,
  });

  page.drawText(safeText, {
    x: annotation.point.x,
    y: annotation.point.y,
    size: fontSize,
    font,
    color: rgb(0.17, 0.14, 0.06),
  });
}

export async function regeneratePdfWithAnnotations(
  originalBytes: Uint8Array,
  annotations: PdfEditorAnnotation[],
) {
  if (annotations.some((annotation) => annotation.kind === "replace-text")) {
    return regeneratePdfWithRasterEdits(originalBytes, annotations);
  }

  const pdfDoc = await PDFDocument.load(originalBytes);

  for (const annotation of annotations) {
    await drawAnnotation(pdfDoc, annotation);
  }

  return new Uint8Array(await pdfDoc.save());
}

export async function runImageOcr(
  imageSource: File | string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(imageSource, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  return data.text.trim();
}
