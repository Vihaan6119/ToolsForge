export type PdfEditMode = "add-text" | "delete-text" | "highlight" | "ai-rewrite" | null;

export type FileMode = "pdf" | "image";

export type RightPanelTab = "text-editor" | "ai-analysis";

export interface PdfPoint {
  x: number;
  y: number;
}

export interface PdfBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PdfEditorAnnotation {
  id: string;
  kind: "text" | "highlight" | "replace-text";
  pageIndex: number;
  point: PdfPoint;
  text: string;              // New text to insert or display
  oldText?: string;          // For replace-text: the original text being replaced
  colorHex?: string;
  replaceBox?: PdfBox;
}

export interface PreviewMeta {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface PdfExtractedTextItem {
  id: string;
  pageIndex: number;
  text: string;
  point: PdfPoint;
  box: PdfBox;
}

export interface TextEditorItem {
  id: string;
  pageIndex: number;
  originalText: string;
  editedText: string;
  point: PdfPoint;
  box: PdfBox;
  isApplied: boolean;
}
