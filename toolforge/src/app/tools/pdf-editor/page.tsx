"use client";

import {
  extractPdfTextItems,
  getOverlayBoxPosition,
  getOverlayPosition,
  getPdfPageCount,
  getPdfPointFromMouse,
  renderPdfPage,
  runImageOcr,
} from "@/app/tools/pdf-editor/pdf-utils";
import type {
  FileMode,
  PdfEditorAnnotation,
  PdfEditMode,
  PdfExtractedTextItem,
  PdfPoint,
  PreviewMeta,
  RightPanelTab,
  TextEditorItem,
} from "@/app/tools/pdf-editor/types";
import { annotationsToOptimizedCommand } from "@/lib/pdf-edit-commands";
import { usePdfVectorEdit } from "@/hooks/use-pdf-vector-edit";
import AuthModal from "@/components/auth-modal";
import AiAssistant from "@/components/ai-assistant";
import UploadArea from "@/components/tools/upload-area";
import ProcessingIndicator from "@/components/ui/processing-indicator";
import Navbar from "@/components/ui/navbar";
import { useAi } from "@/hooks/use-ai";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Download,
  Eraser,
  FileText,
  Highlighter,
  ImageIcon,
  RefreshCw,
  ScanText,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PDF_ACTIONS = [
  { mode: "add-text" as const, label: "Add Text", icon: Type },
  { mode: "delete-text" as const, label: "Delete", icon: Eraser },
  { mode: "highlight" as const, label: "Highlight", icon: Highlighter },
  { mode: "ai-rewrite" as const, label: "AI Rewrite", icon: Sparkles },
];

type PendingPlacement = {
  pageIndex: number;
  point: PdfPoint;
};

export default function PdfEditorPage() {

  // ── File state ─────────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [fileMode, setFileMode] = useState<FileMode | null>(null);

  // ── PDF state ──────────────────────────────────────────────────────────────
  const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [annotations, setAnnotations] = useState<PdfEditorAnnotation[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [previewMetas, setPreviewMetas] = useState<PreviewMeta[]>([]);
  const [extractedTextItems, setExtractedTextItems] = useState<PdfExtractedTextItem[]>([]);

  // ── Image / OCR state ──────────────────────────────────────────────────────
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageOcrText, setImageOcrText] = useState("");
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // ── Text editor panel state ────────────────────────────────────────────────
  const [textEditorItems, setTextEditorItems] = useState<TextEditorItem[]>([]);
  const [expandedTextPages, setExpandedTextPages] = useState<Set<number>>(new Set([0]));

  // ── Processing flags ───────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreparingDocument, setIsPreparingDocument] = useState(false);
  const [isRenderingPages, setIsRenderingPages] = useState(false);

  // ── Edit mode state ────────────────────────────────────────────────────────
  const [mode, setMode] = useState<PdfEditMode>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [selectedOriginalText, setSelectedOriginalText] = useState<PdfExtractedTextItem | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const [textColorHex, setTextColorHex] = useState("#f2f7ff");
  const [aiInstruction, setAiInstruction] = useState("Rewrite this sentence to be clearer and more professional.");

  // ── UI state ───────────────────────────────────────────────────────────────
  const [rightTab, setRightTab] = useState<RightPanelTab>("text-editor");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const downloadUrlRef = useRef<string | null>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  const { isLoading: isAiLoading, error: aiError, generate: generateAi, clearError: clearAiError } = useAi();
  const { editPdfWithBackend, isEditing: isBackendEditing, error: backendEditError, clearError: clearBackendEditError } = usePdfVectorEdit();

  const busy = isProcessing || isPreparingDocument || isRenderingPages || isBackendEditing || isAiLoading;

  // ── Derived maps ───────────────────────────────────────────────────────────
  const previewMetaByPage = useMemo(
    () => new Map(previewMetas.map((m) => [m.pageIndex, m])),
    [previewMetas],
  );

  const textEditorItemsByPage = useMemo(() => {
    const map = new Map<number, TextEditorItem[]>();
    for (const item of textEditorItems) {
      const existing = map.get(item.pageIndex);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.pageIndex, [item]);
      }
    }
    return map;
  }, [textEditorItems]);

  const allExtractedText = useMemo(() => {
    if (fileMode === "image") return imageOcrText;
    if (fileMode !== "pdf" || pageCount === 0) return "";
    const pages: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      const items = textEditorItemsByPage.get(i) ?? [];
      if (items.length > 0) {
        pages.push(`--- Page ${i + 1} ---\n${items.map((it) => it.editedText).join(" ")}`);
      }
    }
    return pages.join("\n\n");
  }, [fileMode, imageOcrText, pageCount, textEditorItemsByPage]);

  const modifiedItemCount = textEditorItems.filter(
    (i) => i.editedText !== i.originalText && !i.isApplied,
  ).length;

  const hasExtractedText = textEditorItems.length > 0 || imageOcrText.length > 0;

  // ── Sync text editor items from extracted PDF text ─────────────────────────
  useEffect(() => {
    setTextEditorItems(
      extractedTextItems.map((item) => ({
        id: item.id,
        pageIndex: item.pageIndex,
        originalText: item.text,
        editedText: item.text,
        point: item.point,
        box: item.box,
        isApplied: false,
      })),
    );
    if (extractedTextItems.length > 0) {
      setExpandedTextPages(new Set([0]));
    }
  }, [extractedTextItems]);

  const setCanvasNode = useCallback((pageIndex: number, node: HTMLCanvasElement | null) => {
    if (node) {
      canvasRefs.current.set(pageIndex, node);
    } else {
      canvasRefs.current.delete(pageIndex);
    }
  }, []);

  const rebuildPdf = useCallback(
    async (nextAnnotations: PdfEditorAnnotation[]) => {
      if (!originalPdfBytes) {
        throw new Error("No original PDF loaded.");
      }

      // Convert visual edits to natural language commands for the Python backend
      const editCommand = annotationsToOptimizedCommand(nextAnnotations);
      
      // Apply edits via Python backend (vector-based, not raster)
      // This uses DeepSeek to intelligently interpret commands and edit the PDF properly
      const editedBytes = await editPdfWithBackend(originalPdfBytes, [editCommand]);
      
      if (!editedBytes) {
        throw new Error("Backend PDF editing failed. Check API logs.");
      }

      setAnnotations(nextAnnotations);
      setPdfBytes(editedBytes);
      return editedBytes;
    },
    [originalPdfBytes, editPdfWithBackend],
  );

  useEffect(() => {
    if (!pdfBytes) {
      setPageCount(0);
      setPreviewMetas([]);
      setExtractedTextItems([]);
      return;
    }

    let active = true;

    void (async () => {
      setIsPreparingDocument(true);
      try {
        const [nextPageCount, nextTextItems] = await Promise.all([
          getPdfPageCount(pdfBytes),
          extractPdfTextItems(pdfBytes),
        ]);

        if (!active) {
          return;
        }

        setPageCount(nextPageCount);
        setExtractedTextItems(nextTextItems);
      } catch {
        if (active) {
          setErrorMessage("Unable to parse this PDF. Please try another file.");
          setPageCount(0);
          setPreviewMetas([]);
          setExtractedTextItems([]);
        }
      } finally {
        if (active) {
          setIsPreparingDocument(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [pdfBytes]);

  useEffect(() => {
    if (!pdfBytes || pageCount <= 0) {
      return;
    }

    const allCanvasesReady = Array.from({ length: pageCount }, (_unused, pageIndex) =>
      canvasRefs.current.has(pageIndex),
    ).every(Boolean);

    if (!allCanvasesReady) {
      return;
    }

    let active = true;

    void (async () => {
      setIsRenderingPages(true);
      try {
        const nextMetas: PreviewMeta[] = [];

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          const canvas = canvasRefs.current.get(pageIndex);

          if (!canvas) {
            return;
          }

          const meta = await renderPdfPage(canvas, pdfBytes, pageIndex);
          nextMetas.push(meta);
        }

        if (!active) {
          return;
        }

        setPreviewMetas(nextMetas);
      } catch {
        if (active) {
          setErrorMessage("Could not render the full PDF preview.");
        }
      } finally {
        if (active) {
          setIsRenderingPages(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [pageCount, pdfBytes]);

  const handleSetFile = useCallback(async (nextFile: File | null) => {
    setFile(nextFile);
    setMode(null);
    setPendingPlacement(null);
    setSelectedOriginalText(null);
    setTextInputValue("");
    setErrorMessage(null);
    setStatusMessage(null);
    setAnnotations([]);
    clearAiError();

    setImageOcrText("");
    setOcrProgress(0);
    setIsOcrRunning(false);
    setTextEditorItems([]);

    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
      setImagePreviewUrl(null);
    }

    if (!nextFile) {
      setFileMode(null);
      setOriginalPdfBytes(null);
      setPdfBytes(null);
      setPageCount(0);
      setPreviewMetas([]);
      setExtractedTextItems([]);
      return;
    }

    const isImage = nextFile.type.startsWith("image/");
    setFileMode(isImage ? "image" : "pdf");

    if (isImage) {
      const url = URL.createObjectURL(nextFile);
      imagePreviewUrlRef.current = url;
      setImagePreviewUrl(url);
      setStatusMessage("Image loaded. Click 'Extract Text (OCR)' to extract all text.");
      return;
    }

    setIsProcessing(true);
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      setOriginalPdfBytes(bytes);
      setPdfBytes(bytes);
      setStatusMessage("PDF loaded. All pages rendered. Edit extracted text in the right panel.");
    } catch {
      setOriginalPdfBytes(null);
      setPdfBytes(null);
      setPageCount(0);
      setPreviewMetas([]);
      setExtractedTextItems([]);
      setErrorMessage("Failed to load this PDF. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  }, [clearAiError]);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, []);

  const handleSelectMode = (nextMode: PdfEditMode) => {
    if (!pdfBytes || busy) {
      return;
    }

    setMode(nextMode);
    setPendingPlacement(null);
    setSelectedOriginalText(null);
    clearAiError();
    setErrorMessage(null);

    if (nextMode === "delete-text") {
      setStatusMessage("Delete mode: Click a marker dot to remove that annotation.");
      return;
    }

    if (nextMode === "ai-rewrite") {
      setStatusMessage("AI Rewrite: Click original PDF text, add instruction, then rewrite.");
      return;
    }

    setStatusMessage("Click any page to place content at that position.");
  };

  const commitTextLikeEdit = useCallback(
    async (kind: "add-text" | "highlight") => {
      if (!pdfBytes || !pendingPlacement || busy) {
        return;
      }

      if (!textInputValue.trim()) {
        setErrorMessage("Enter text before applying this action.");
        return;
      }

      setIsProcessing(true);
      setErrorMessage(null);
      try {
        const nextAnnotations = [
          ...annotations,
          {
            id: crypto.randomUUID(),
            kind: kind === "add-text" ? "text" : "highlight",
            pageIndex: pendingPlacement.pageIndex,
            point: pendingPlacement.point,
            text: textInputValue.trim(),
            colorHex: kind === "add-text" ? textColorHex : undefined,
          } satisfies PdfEditorAnnotation,
        ];

        await rebuildPdf(nextAnnotations);
        setStatusMessage(kind === "add-text" ? "Text added successfully." : "Highlight added successfully.");
        setTextInputValue("");
        setPendingPlacement(null);
      } catch {
        setErrorMessage("Unable to apply this edit. Try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [annotations, busy, pdfBytes, pendingPlacement, rebuildPdf, textColorHex, textInputValue],
  );

  const removeAnnotationById = useCallback(
    async (annotationId: string) => {
      if (busy) {
        return;
      }

      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const nextAnnotations = annotations.filter((annotation) => annotation.id !== annotationId);
        await rebuildPdf(nextAnnotations);
        setStatusMessage("Removed the selected annotation.");
        setPendingPlacement(null);
      } catch {
        setErrorMessage("Could not remove the selected annotation.");
      } finally {
        setIsProcessing(false);
      }
    },
    [annotations, busy, rebuildPdf],
  );

  const findClosestTextOnPage = useCallback(
    (pageIndex: number, point: PdfPoint) => {
      const pageMeta = previewMetaByPage.get(pageIndex);

      if (!pageMeta) {
        return null;
      }

      const candidates = extractedTextItems.filter((item) => item.pageIndex === pageIndex);

      if (!candidates.length) {
        return null;
      }

      let best: PdfExtractedTextItem | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const candidate of candidates) {
        const distance = Math.hypot(candidate.point.x - point.x, candidate.point.y - point.y);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = candidate;
        }
      }

      const threshold = Math.max(22, pageMeta.pageWidth * 0.035);

      if (bestDistance > threshold) {
        return null;
      }

      return best;
    },
    [extractedTextItems, previewMetaByPage],
  );

  const onCanvasClick = async (pageIndex: number, event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pdfBytes || busy || !mode) {
      return;
    }

    const canvas = canvasRefs.current.get(pageIndex);
    const pageMeta = previewMetaByPage.get(pageIndex);

    if (!canvas || !pageMeta) {
      return;
    }

    if (mode === "delete-text") {
      setStatusMessage("Click an annotation marker dot to remove it.");
      return;
    }

    const point = getPdfPointFromMouse(event, canvas, pageMeta);

    if (mode === "ai-rewrite") {
      const selected = findClosestTextOnPage(pageIndex, point);

      if (!selected) {
        setErrorMessage("No text found near that click. Try clicking directly on visible text.");
        return;
      }

      setSelectedOriginalText(selected);
      setPendingPlacement(null);
      setErrorMessage(null);
      setStatusMessage(`Selected: "${selected.text.slice(0, 60)}" — add instruction and click AI Rewrite.`);
      return;
    }

    setSelectedOriginalText(null);
    setPendingPlacement({
      pageIndex,
      point,
    });
    setErrorMessage(null);
    setStatusMessage(`Placement on page ${pageIndex + 1}. Enter text and apply.`);
  };

  const rewriteSelectedOriginalText = useCallback(async () => {
    if (!selectedOriginalText || busy || isAiLoading) {
      return;
    }

    const instruction = aiInstruction.trim() || "Rewrite this sentence to be clearer and more professional.";

    setIsProcessing(true);
    setErrorMessage(null);
    clearAiError();

    try {
      const rewritten = await generateAi({
        prompt: [
          "Rewrite the PDF text below.",
          `Instruction: ${instruction}`,
          `Original text: ${selectedOriginalText.text}`,
          "Return only the rewritten text and no extra commentary.",
        ].join("\n"),
        system:
          "You rewrite small fragments of PDF text while preserving the original meaning unless explicitly asked to change it.",
        temperature: 0.35,
      });

      const nextText = rewritten.trim();

      if (!nextText) {
        throw new Error("AI returned empty rewritten text. Please try a more specific instruction.");
      }

      const nextAnnotations = [
        ...annotations,
        {
          id: crypto.randomUUID(),
          kind: "replace-text",
          pageIndex: selectedOriginalText.pageIndex,
          point: selectedOriginalText.point,
          text: nextText,
          oldText: selectedOriginalText.text,
          colorHex: "#0f172a",
          replaceBox: selectedOriginalText.box,
        } satisfies PdfEditorAnnotation,
      ];
      await rebuildPdf(nextAnnotations);
      setSelectedOriginalText(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI rewrite failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    aiInstruction,
    annotations,
    busy,
    clearAiError,
    generateAi,
    isAiLoading,
    rebuildPdf,
    selectedOriginalText,
  ]);

  const handleDownload = () => {
    if (!pdfBytes || busy) {
      return;
    }

    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
    }

    const bytesForBlob = Uint8Array.from(pdfBytes);
    const blob = new Blob([bytesForBlob], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    downloadUrlRef.current = url;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${file?.name?.replace(/\.pdf$/i, "") ?? "toolforge-edited"}-edited.pdf`;
    anchor.click();
  };

  const handleDownloadText = () => {
    if (!allExtractedText) return;
    const blob = new Blob([allExtractedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name?.replace(/\.[^.]+$/, "") ?? "extracted"}-text.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAllText = () => {
    if (!allExtractedText) return;
    void navigator.clipboard.writeText(allExtractedText);
    setStatusMessage("All text copied to clipboard.");
  };

  const handleRunOcr = async () => {
    if (!file || !file.type.startsWith("image/")) return;
    setIsOcrRunning(true);
    setOcrProgress(0);
    setErrorMessage(null);
    try {
      const text = await runImageOcr(file, (p) => setOcrProgress(p));
      setImageOcrText(text || "(No text found in this image)");
      setStatusMessage("OCR complete. Edit the extracted text and download it.");
    } catch {
      setErrorMessage("OCR failed. Please try a clearer image.");
    } finally {
      setIsOcrRunning(false);
      setOcrProgress(0);
    }
  };

  const applyTextEdit = useCallback(
    async (itemId: string) => {
      if (!originalPdfBytes || busy) return;
      const item = textEditorItems.find((i) => i.id === itemId);
      if (!item || item.editedText.trim() === item.originalText.trim()) return;
      setIsProcessing(true);
      setErrorMessage(null);
      try {
        const filtered = annotations.filter((a) => a.id !== itemId);
        const nextAnnotations: PdfEditorAnnotation[] = [
          ...filtered,
          {
            id: itemId,
            kind: "replace-text",
            pageIndex: item.pageIndex,
            point: item.point,
            text: item.editedText.trim(),
            oldText: item.originalText.trim(),
            colorHex: "#0f172a",
            replaceBox: item.box,
          },
        ];
        await rebuildPdf(nextAnnotations);
        setTextEditorItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, isApplied: true } : i)),
        );
        setStatusMessage("Text edit applied to PDF.");
      } catch {
        setErrorMessage("Could not apply text edit.");
      } finally {
        setIsProcessing(false);
      }
    },
    [annotations, busy, originalPdfBytes, rebuildPdf, textEditorItems],
  );

  const applyAllTextEdits = useCallback(async () => {
    if (!originalPdfBytes || busy) return;
    const modified = textEditorItems.filter(
      (i) => i.editedText.trim() !== i.originalText.trim() && !i.isApplied,
    );
    if (!modified.length) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const modifiedIds = new Set(modified.map((i) => i.id));
      const filtered = annotations.filter((a) => !modifiedIds.has(a.id));
      const nextAnnotations: PdfEditorAnnotation[] = [
        ...filtered,
        ...modified.map((item) => ({
          id: item.id,
          kind: "replace-text" as const,
          pageIndex: item.pageIndex,
          point: item.point,
          text: item.editedText.trim(),
          colorHex: "#0f172a",
          replaceBox: item.box,
        })),
      ];
      await rebuildPdf(nextAnnotations);
      setTextEditorItems((prev) =>
        prev.map((i) => (modifiedIds.has(i.id) ? { ...i, isApplied: true } : i)),
      );
      setStatusMessage(`Applied ${modified.length} text edit${modified.length !== 1 ? "s" : ""} to PDF.`);
    } catch {
      setErrorMessage("Could not apply all text edits.");
    } finally {
      setIsProcessing(false);
    }
  }, [annotations, busy, originalPdfBytes, rebuildPdf, textEditorItems]);

  const updateTextEditorItem = (id: string, newText: string) => {
    setTextEditorItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, editedText: newText, isApplied: false } : item)),
    );
  };

  const toggleTextPage = (pageIndex: number) => {
    setExpandedTextPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return next;
    });
  };

  const expandAllPages = () => {
    setExpandedTextPages(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  };

  return (
    <div className="relative min-h-screen pb-10">
      <Navbar />
      <main className="mx-auto w-[min(1480px,99vw)] space-y-4 px-2 py-4">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-white/12 bg-white/5 px-6 py-4 shadow-xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Document Editor · DeepSeek R1
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                PDF &amp; Image Editor
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                View all pages, extract and edit text, apply AI rewrites with your local DeepSeek model, then download.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {file && (
                <div className="rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs text-slate-200">
                  <span className="text-slate-400">File: </span>
                  <span className="font-medium text-white">{file.name}</span>
                  {fileMode === "pdf" && pageCount > 0 && (
                    <span className="ml-2 text-slate-400">· {pageCount} page{pageCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ── 3-panel workspace ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:grid lg:h-[calc(100vh-195px)] lg:min-h-170 lg:grid-cols-[260px_1fr_360px]">

          {/* ── LEFT: Controls ─────────────────────────────────────────── */}
          <aside className="flex flex-col gap-3 overflow-y-auto">

            {/* Upload */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <UploadArea
                acceptedFileTypes="application/pdf,image/*"
                file={file}
                onFileSelect={handleSetFile}
                disabled={busy}
                helperText={
                  !file
                    ? "PDF or image (PNG, JPG, WEBP…)"
                    : fileMode === "image"
                      ? "Image loaded. Run OCR to extract text."
                      : "PDF loaded. Select an action below."
                }
              />
            </div>

            {/* Image OCR */}
            {fileMode === "image" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-300">Text Extraction</p>
                <button
                  type="button"
                  onClick={() => void handleRunOcr()}
                  disabled={isOcrRunning || !file}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400/80 px-3 py-2.5 text-sm font-semibold text-slate-900 transition enabled:hover:bg-cyan-300 disabled:opacity-40"
                >
                  {isOcrRunning ? (
                    <><RefreshCw size={14} className="animate-spin" />Extracting… {ocrProgress}%</>
                  ) : (
                    <><ScanText size={14} />Extract Text (OCR)</>
                  )}
                </button>
                {isOcrRunning && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400 transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* PDF Edit Actions */}
            {fileMode === "pdf" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-300">Editing Actions</p>
                <p className="mb-3 text-xs text-slate-500">Select a mode, then click the PDF viewer.</p>
                <div className="grid grid-cols-2 gap-2">
                  {PDF_ACTIONS.map((action) => (
                    <motion.button
                      key={action.label}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      disabled={!pdfBytes || busy}
                      onClick={() => handleSelectMode(action.mode)}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-2 py-2.5 text-xs font-medium text-slate-100 transition enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40",
                        mode === action.mode && "border-cyan-300/60 bg-cyan-300/20 text-cyan-50",
                      )}
                    >
                      <action.icon size={13} />
                      {action.label}
                    </motion.button>
                  ))}
                </div>

                {(mode === "add-text" || mode === "highlight") && pendingPlacement && (
                  <div className="mt-3 space-y-2 rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-3">
                    <p className="text-xs text-cyan-200">Placement on page {pendingPlacement.pageIndex + 1}</p>
                    {mode === "add-text" && (
                      <label className="flex items-center gap-2 text-xs text-cyan-200">
                        Color
                        <input type="color" value={textColorHex} onChange={(e) => setTextColorHex(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-white/20 bg-transparent" />
                        <span className="font-mono text-slate-400">{textColorHex}</span>
                      </label>
                    )}
                    <input
                      value={textInputValue}
                      onChange={(e) => setTextInputValue(e.target.value)}
                      placeholder={mode === "highlight" ? "Highlight note…" : "Type text…"}
                      className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-1.5 text-sm text-white outline-none ring-cyan-300/50 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => void commitTextLikeEdit(mode === "highlight" ? "highlight" : "add-text")}
                      disabled={busy || !textInputValue.trim()}
                      className="rounded-lg bg-cyan-300/80 px-3 py-1.5 text-xs font-semibold text-slate-900 transition enabled:hover:bg-cyan-200 disabled:opacity-40"
                    >
                      Apply {mode === "highlight" ? "Highlight" : "Text"}
                    </button>
                  </div>
                )}

                {mode === "ai-rewrite" && (
                  <div className="mt-3 space-y-2 rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-3">
                    <p className="text-xs text-cyan-200">
                      {selectedOriginalText
                        ? `Selected: "${selectedOriginalText.text.slice(0, 50)}${selectedOriginalText.text.length > 50 ? "…" : ""}"`
                        : "Click original PDF text to select it."}
                    </p>
                    <textarea
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      placeholder="Rewrite instruction…"
                      className="min-h-16 w-full resize-none rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-xs text-white outline-none ring-cyan-300/50 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => void rewriteSelectedOriginalText()}
                      disabled={!selectedOriginalText || busy || isAiLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-300/80 px-3 py-1.5 text-xs font-semibold text-slate-900 transition enabled:hover:bg-cyan-200 disabled:opacity-40"
                    >
                      <Sparkles size={12} />
                      {isAiLoading ? "Rewriting…" : "AI Rewrite"}
                    </button>
                    {aiError && <p className="text-xs text-rose-300">{aiError}</p>}
                  </div>
                )}
              </div>
            )}

            {busy && (
              <ProcessingIndicator
                title={isPreparingDocument ? "Parsing PDF…" : "Updating PDF…"}
                description={isPreparingDocument ? "Loading pages and extracting text blocks." : "Applying your edits and rebuilding the document."}
              />
            )}

            {statusMessage && !busy && (
              <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-200">{statusMessage}</p>
            )}
            {(errorMessage || backendEditError) && (
              <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-200">
                {errorMessage || backendEditError}
              </p>
            )}



            {(pdfBytes || imageOcrText) && (
              <div className="space-y-2">
                {pdfBytes && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!pdfBytes || busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-400 to-blue-400 px-3 py-2.5 text-sm font-semibold text-slate-900 transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    <Download size={15} />
                    Download Edited PDF
                  </button>
                )}
                {hasExtractedText && (
                  <button
                    type="button"
                    onClick={handleDownloadText}
                    disabled={!allExtractedText}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/15 disabled:opacity-40"
                  >
                    <FileText size={15} />
                    Download as .txt
                  </button>
                )}
              </div>
            )}

            <p className="text-center text-xs text-slate-600">
              <Link href="/" className="text-cyan-400 hover:text-cyan-300">← ToolForge homepage</Link>
            </p>
          </aside>

          {/* ── CENTER: Document viewer ─────────────────────────────────── */}
          <section className="min-h-100 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80 p-3">
            {fileMode === "pdf" && pdfBytes && pageCount > 0 ? (
              <div className="space-y-5">
                {Array.from({ length: pageCount }).map((_, pageIndex) => {
                  const pageMeta = previewMetaByPage.get(pageIndex);
                  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);
                  const selectedTextOnPage = selectedOriginalText?.pageIndex === pageIndex ? selectedOriginalText : null;

                  return (
                    <div key={`page-${pageIndex}`} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs font-medium text-slate-300">Page {pageIndex + 1}</span>
                        {pageAnnotations.length > 0 && (
                          <span className="text-xs text-cyan-400">{pageAnnotations.length} annotation{pageAnnotations.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <div className="relative overflow-hidden rounded-xl border border-white/8 shadow-md">
                        <canvas
                          ref={(node) => setCanvasNode(pageIndex, node)}
                          onClick={(event) => void onCanvasClick(pageIndex, event)}
                          className={cn("h-auto w-full bg-white", mode === "delete-text" ? "cursor-crosshair" : "cursor-text")}
                        />
                        {pageMeta && pageAnnotations.map((annotation) => {
                          const isDeleteMode = mode === "delete-text";
                          return (
                            <button
                              key={annotation.id}
                              type="button"
                              onClick={() => { if (isDeleteMode) void removeAnnotationById(annotation.id); }}
                              title={isDeleteMode ? "Click to remove" : annotation.text.slice(0, 60)}
                              className={cn(
                                "absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition",
                                annotation.kind === "highlight" ? "border-amber-100 bg-amber-300" : annotation.kind === "replace-text" ? "border-cyan-100 bg-cyan-300" : "border-white/50 bg-cyan-400",
                                isDeleteMode ? "cursor-pointer ring-2 ring-transparent hover:scale-125 hover:ring-rose-400/60" : "pointer-events-none",
                              )}
                              style={{
                                ...getOverlayPosition(annotation.point, pageMeta),
                                ...(annotation.kind === "text" ? { borderColor: annotation.colorHex ?? "#67e8f9" } : null),
                              }}
                              aria-label={isDeleteMode ? "Delete annotation" : "Annotation marker"}
                            />
                          );
                        })}
                        {pageMeta && pendingPlacement?.pageIndex === pageIndex && (
                          <div className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-100 bg-cyan-400" style={getOverlayPosition(pendingPlacement.point, pageMeta)} />
                        )}
                        {pageMeta && selectedTextOnPage && (
                          <div className="pointer-events-none absolute border-2 border-cyan-300 bg-cyan-300/20" style={getOverlayBoxPosition(selectedTextOnPage.box, pageMeta)} />
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : fileMode === "image" && imagePreviewUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs font-medium text-slate-300">Image Preview</span>
                  {isOcrRunning && <span className="text-xs text-cyan-400">Running OCR… {ocrProgress}%</span>}
                </div>
                <div className="relative overflow-hidden rounded-xl border border-white/8 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreviewUrl} alt={file?.name ?? "Uploaded image"} className="h-auto w-full" />
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-100 flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-10">
                  <ImageIcon size={52} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-base font-medium text-slate-300">No document loaded</p>
                  <p className="mt-2 text-sm text-slate-500">Upload a PDF or image file to view all pages here.</p>
                </div>
              </div>
            )}
          </section>

          {/* ── RIGHT: Text editor panel ────────────────────────────────── */}
          <aside className="flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/3">

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-white/10">
              <button
                type="button"
                onClick={() => setRightTab("text-editor")}
                className={cn("flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition", rightTab === "text-editor" ? "border-b-2 border-cyan-400 text-cyan-100" : "text-slate-500 hover:text-slate-200")}
              >
                <FileText size={12} />
                Extracted Text
              </button>
              <button
                type="button"
                onClick={() => setRightTab("ai-analysis")}
                className={cn("flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition", rightTab === "ai-analysis" ? "border-b-2 border-cyan-400 text-cyan-100" : "text-slate-500 hover:text-slate-200")}
              >
                <Sparkles size={12} />
                AI Analysis
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {rightTab === "text-editor" ? (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {hasExtractedText && (
                    <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-3 py-2">
                      <p className="text-xs text-slate-400">
                        {fileMode === "pdf" ? `${textEditorItems.length} text block${textEditorItems.length !== 1 ? "s" : ""}` : "OCR result"}
                        {modifiedItemCount > 0 && <span className="ml-1.5 text-amber-400">· {modifiedItemCount} unsaved</span>}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {fileMode === "pdf" && pageCount > 1 && (
                          <button type="button" onClick={expandAllPages} className="rounded-lg border border-white/12 bg-white/8 px-2 py-1.5 text-xs text-slate-400 transition hover:bg-white/15 hover:text-slate-200">All</button>
                        )}
                        <button type="button" onClick={handleCopyAllText} title="Copy all text" className="rounded-lg border border-white/12 bg-white/8 p-1.5 text-slate-400 transition hover:bg-white/15 hover:text-slate-200">
                          <ClipboardCopy size={12} />
                        </button>
                        {fileMode === "pdf" && modifiedItemCount > 0 && (
                          <button type="button" onClick={() => void applyAllTextEdits()} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/15 px-2 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-40">
                            <CheckCheck size={12} />
                            Apply All
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-3">
                    {fileMode === "pdf" && textEditorItems.length > 0 ? (
                      <div className="space-y-2">
                        {Array.from({ length: pageCount }, (_, pageIndex) => {
                          const items = textEditorItemsByPage.get(pageIndex) ?? [];
                          if (!items.length) return null;
                          const isExpanded = expandedTextPages.has(pageIndex);
                          const pageModified = items.filter((i) => i.editedText !== i.originalText && !i.isApplied).length;
                          return (
                            <div key={`tp-${pageIndex}`} className="overflow-hidden rounded-xl border border-white/8 bg-slate-900/60">
                              <button type="button" onClick={() => toggleTextPage(pageIndex)} className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-white/5">
                                <span className="text-xs font-medium text-slate-200">
                                  Page {pageIndex + 1}
                                  <span className="ml-1.5 text-slate-500">{items.length} blocks</span>
                                  {pageModified > 0 && <span className="ml-1.5 text-amber-400">· {pageModified} edited</span>}
                                </span>
                                {isExpanded ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
                              </button>
                              {isExpanded && (
                                <div className="space-y-1.5 border-t border-white/5 p-2">
                                  {items.map((item) => {
                                    const isModified = item.editedText !== item.originalText;
                                    return (
                                      <div key={item.id} className={cn("group rounded-lg border p-2 transition", isModified && !item.isApplied ? "border-amber-400/25 bg-amber-400/5" : item.isApplied ? "border-emerald-400/20 bg-emerald-400/5" : "border-white/5 bg-white/2")}>
                                        <div className="flex items-start gap-1.5">
                                          <textarea
                                            value={item.editedText}
                                            onChange={(e) => updateTextEditorItem(item.id, e.target.value)}
                                            rows={Math.max(1, Math.ceil(item.editedText.length / 38))}
                                            className="min-h-6 flex-1 resize-y rounded bg-transparent p-0.5 text-xs leading-relaxed text-slate-100 outline-none focus:rounded-md focus:bg-slate-900/50 focus:px-1.5 transition"
                                          />
                                          {isModified && !item.isApplied && (
                                            <button type="button" onClick={() => void applyTextEdit(item.id)} disabled={busy} title="Apply to PDF" className="mt-0.5 shrink-0 rounded-lg border border-cyan-400/25 bg-cyan-400/12 p-1.5 text-cyan-300 transition hover:bg-cyan-400/22 disabled:opacity-40">
                                              <Check size={11} />
                                            </button>
                                          )}
                                          {item.isApplied && (
                                            <span className="mt-0.5 shrink-0 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-1.5 text-emerald-400">
                                              <Check size={11} />
                                            </span>
                                          )}
                                        </div>
                                        {isModified && !item.isApplied && (
                                          <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">
                                            Was: <span className="line-through">{item.originalText}</span>
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : fileMode === "image" ? (
                      <div className="space-y-3">
                        {imageOcrText ? (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-400">Edit extracted text freely below</p>
                              <button type="button" onClick={() => setImageOcrText("")} className="rounded p-1 text-slate-500 transition hover:text-slate-300"><X size={12} /></button>
                            </div>
                            <textarea
                              value={imageOcrText}
                              onChange={(e) => setImageOcrText(e.target.value)}
                              className="min-h-80 w-full resize-y rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none ring-cyan-400/40 focus:ring-2"
                            />
                          </>
                        ) : (
                          <div className="flex min-h-50 flex-col items-center justify-center gap-3 text-center">
                            <ScanText size={36} className="text-slate-600" />
                            <p className="text-sm text-slate-400">{isOcrRunning ? `Extracting… ${ocrProgress}%` : "Click 'Extract Text (OCR)' to start"}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                          <div className="flex min-h-50 flex-col items-center justify-center gap-3 text-center">
                        <FileText size={36} className="text-slate-600" />
                        <p className="text-sm text-slate-400">{fileMode === "pdf" && busy ? "Extracting text blocks…" : "Upload a file to see extracted text"}</p>
                        <p className="text-xs text-slate-600">PDF text is extracted automatically.<br />Images require the OCR step.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3">
                  <AiAssistant
                    toolContext={`PDF/image document editor. File: ${file?.name ?? "none"}. ${allExtractedText ? `Extracted text preview: ${allExtractedText.slice(0, 600)}` : "No text extracted yet."}`}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
