"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import { useAi } from "@/hooks/use-ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bbox } from "tesseract.js";

const FONT_FAMILIES = ["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana"];
const MAX_CANVAS_WIDTH = 920;

interface ImageMeta {
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
}

interface OcrTextUnit {
  text: string;
  bbox: Bbox;
}

type OcrStatus = "idle" | "running" | "done" | "failed";
type FabricModule = typeof import("fabric");
type FabricTextObject = import("fabric").IText | import("fabric").Textbox;

export default function ImageTextEditorPage() {

  const [file, setFile] = useState<File | null>(null);
  const [newText, setNewText] = useState("Your text here");
  const [newFontSize, setNewFontSize] = useState(34);
  const [newColor, setNewColor] = useState("#ffffff");
  const [newFontFamily, setNewFontFamily] = useState(FONT_FAMILIES[0]);
  const [selectedText, setSelectedText] = useState("");
  const [selectedFontSize, setSelectedFontSize] = useState(34);
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [selectedFontFamily, setSelectedFontFamily] = useState(FONT_FAMILIES[0]);
  const [aiInstruction, setAiInstruction] = useState("Rewrite this text to be clearer and professional.");
  const [hasSelectedText, setHasSelectedText] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializingCanvas, setIsInitializingCanvas] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabricApiRef = useRef<FabricModule | null>(null);
  const fabricCanvasRef = useRef<import("fabric").Canvas | null>(null);
  const imageMetaRef = useRef<ImageMeta | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const {
    isLoading: isAiRewriting,
    error: aiError,
    clearError: clearAiError,
    generate: generateAi,
  } = useAi();

  const getActiveTextObject = useCallback((): FabricTextObject | null => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return null;
    }

    const activeObject = canvas.getActiveObject();
    if (!activeObject || (activeObject.type !== "i-text" && activeObject.type !== "textbox")) {
      return null;
    }

    return activeObject as FabricTextObject;
  }, []);

  const syncSelectedTextState = useCallback(() => {
    const active = getActiveTextObject();
    if (!active) {
      setHasSelectedText(false);
      return;
    }

    setHasSelectedText(true);
    setSelectedText(active.text ?? "");
    setSelectedFontSize(typeof active.fontSize === "number" ? active.fontSize : 34);
    setSelectedColor(typeof active.fill === "string" ? active.fill : "#ffffff");
    setSelectedFontFamily(active.fontFamily ?? FONT_FAMILIES[0]);
  }, [getActiveTextObject]);

  const initializeFabricEditor = useCallback(async (incomingFile: File) => {
    if (!canvasRef.current) {
      return;
    }

    setIsInitializingCanvas(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setOcrStatus("idle");
    setOcrProgress(0);

    try {
      const fabricModule = await import("fabric");
      fabricApiRef.current = fabricModule;

      const imageUrl = URL.createObjectURL(incomingFile);
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
      imageUrlRef.current = imageUrl;

      const imageElement = new Image();
      await new Promise<void>((resolve, reject) => {
        imageElement.onload = () => resolve();
        imageElement.onerror = () => reject(new Error("Unable to load selected image."));
        imageElement.src = imageUrl;
      });

      const scale = Math.min(1, MAX_CANVAS_WIDTH / imageElement.naturalWidth);
      const canvasWidth = Math.max(1, Math.round(imageElement.naturalWidth * scale));
      const canvasHeight = Math.max(1, Math.round(imageElement.naturalHeight * scale));

      imageMetaRef.current = {
        naturalWidth: imageElement.naturalWidth,
        naturalHeight: imageElement.naturalHeight,
        scale,
      };

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      const canvas = new fabricModule.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        preserveObjectStacking: true,
        selection: true,
      });

      const backgroundImage = await fabricModule.FabricImage.fromURL(imageUrl, {
        crossOrigin: "anonymous",
      });
      backgroundImage.set({ selectable: false, evented: false });
      backgroundImage.scaleToWidth(canvasWidth);
      backgroundImage.scaleToHeight(canvasHeight);
      canvas.backgroundImage = backgroundImage;
      canvas.renderAll();

      canvas.on("selection:created", syncSelectedTextState);
      canvas.on("selection:updated", syncSelectedTextState);
      canvas.on("selection:cleared", () => setHasSelectedText(false));
      canvas.on("object:modified", syncSelectedTextState);

      fabricCanvasRef.current = canvas;
      setFile(incomingFile);
      setStatusMessage("Image loaded. Add text manually or run OCR to create editable text layers.");
    } catch {
      setErrorMessage("Unable to initialize the editor for this image.");
    } finally {
      setIsInitializingCanvas(false);
    }
  }, [syncSelectedTextState]);

  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
    };
  }, []);

  const addTextLayer = () => {
    const canvas = fabricCanvasRef.current;
    const fabricModule = fabricApiRef.current;

    if (!canvas || !fabricModule || !newText.trim()) {
      return;
    }

    const text = new fabricModule.IText(newText.trim(), {
      left: canvas.getWidth() * 0.2,
      top: canvas.getHeight() * 0.2,
      fontSize: newFontSize,
      fill: newColor,
      fontFamily: newFontFamily,
      editable: true,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    syncSelectedTextState();
    setStatusMessage("Added a new editable text layer.");
  };

  const applySelectedTextChanges = () => {
    const canvas = fabricCanvasRef.current;
    const active = getActiveTextObject();

    if (!canvas || !active) {
      return;
    }

    active.set({
      text: selectedText,
      fontSize: selectedFontSize,
      fill: selectedColor,
      fontFamily: selectedFontFamily,
    });
    canvas.requestRenderAll();
    syncSelectedTextState();
  };

  const removeSelectedTextLayer = () => {
    const canvas = fabricCanvasRef.current;
    const active = getActiveTextObject();

    if (!canvas || !active) {
      return;
    }

    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setHasSelectedText(false);
    setStatusMessage("Selected text layer removed.");
  };

  const rewriteSelectedTextWithAi = async () => {
    const canvas = fabricCanvasRef.current;
    const active = getActiveTextObject();

    if (!canvas || !active || isAiRewriting) {
      return;
    }

    const sourceText = (active.text ?? "").trim();

    if (!sourceText) {
      setErrorMessage("Select a text layer with content before using AI rewrite.");
      return;
    }

    setErrorMessage(null);
    clearAiError();

    try {
      const rewritten = await generateAi({
        prompt: [
          "Rewrite the text below.",
          `Instruction: ${aiInstruction.trim() || "Rewrite this text to be clearer and professional."}`,
          `Original text: ${sourceText}`,
          "Return only rewritten text with no explanations.",
        ].join("\n"),
        system:
          "You rewrite OCR/image text snippets while preserving intent unless user instruction says otherwise.",
        temperature: 0.35,
      });

      const nextText = rewritten.trim();

      if (!nextText) {
        throw new Error("AI returned empty rewritten text.");
      }

      active.set({ text: nextText });
      canvas.requestRenderAll();

      setSelectedText(nextText);
      setStatusMessage("Applied AI rewrite to selected text layer.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI rewrite failed. Please try again.");
    }
  };

  const runOcr = async () => {
    const canvas = fabricCanvasRef.current;
    const fabricModule = fabricApiRef.current;
    const imageMeta = imageMetaRef.current;

    if (!file || !canvas || !fabricModule || !imageMeta) {
      return;
    }

    setOcrStatus("running");
    setOcrProgress(0);
    setErrorMessage(null);

    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "eng", {
        logger: (log) => {
          if (log.status === "recognizing text") {
            setOcrProgress(Math.round(log.progress * 100));
          }
        },
      });

      const ocrData = result.data as unknown as {
        words?: OcrTextUnit[];
        lines?: OcrTextUnit[];
      };

      const units = (ocrData.words?.length ? ocrData.words : ocrData.lines) ?? [];

      const nonEmptyWords = units
        .map((word: OcrTextUnit) => ({ text: word.text.trim(), bbox: word.bbox }))
        .filter((word: OcrTextUnit) => word.text.length > 0)
        .slice(0, 180);

      for (const word of nonEmptyWords) {
        const width = Math.max(8, (word.bbox.x1 - word.bbox.x0) * imageMeta.scale);
        const height = Math.max(16, (word.bbox.y1 - word.bbox.y0) * imageMeta.scale);
        const textObject = new fabricModule.Textbox(word.text, {
          left: word.bbox.x0 * imageMeta.scale,
          top: word.bbox.y0 * imageMeta.scale,
          width,
          fontSize: Math.max(12, Math.round(height * 0.9)),
          fontFamily: "Arial",
          fill: "#f8fafc",
          editable: true,
          backgroundColor: "rgba(2, 6, 23, 0.2)",
        });

        canvas.add(textObject);
      }

      canvas.requestRenderAll();
      setOcrStatus("done");
      setStatusMessage(`OCR complete. Added ${nonEmptyWords.length} editable text layers.`);
    } catch {
      setOcrStatus("failed");
      setErrorMessage("OCR failed. Try a clearer image with stronger contrast.");
    }
  };

  const download = async () => {
    const canvas = fabricCanvasRef.current;

    if (!canvas || !file) {
      return;
    }

    const link = document.createElement("a");
    link.download = `${file.name.replace(/\.[^.]+$/, "")}_edited.png`;
    link.href = canvas.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    link.click();
  };

  return (
    <ToolPageShell
      title="Image Text Editor"
      description="Run OCR to extract text layers, then edit and reposition them visually with Fabric.js."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Upload Image" description="Load a screenshot, photo, or scan to start OCR-based text editing.">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const incomingFile = event.dataTransfer.files[0];
                if (incomingFile) {
                  void initializeFabricEditor(incomingFile);
                }
              }}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/18 bg-slate-950/50 transition hover:border-cyan-300/50"
            >
              <p className="text-sm text-slate-200">{file ? file.name : "Drag and drop or click to choose an image"}</p>
              <p className="mt-1 text-xs text-slate-400">Supported: PNG, JPG, WEBP</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const incomingFile = event.target.files?.[0];
                  if (incomingFile) {
                    void initializeFabricEditor(incomingFile);
                  }
                }}
              />
            </div>
          </ToolPanel>

          <ToolPanel title="Canvas Editor" description="OCR-generated text and manual text layers are fully draggable and editable.">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/65 p-3">
              <canvas ref={canvasRef} className="mx-auto max-h-155 w-full rounded-md border border-white/10" />
              {null}
            </div>

            {ocrStatus === "running" ? (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Running OCR...</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runOcr()}
                disabled={!file || isInitializingCanvas || ocrStatus === "running"}
                className="rounded-xl border border-cyan-300/45 bg-cyan-300/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition enabled:hover:bg-cyan-300/25 disabled:opacity-45"
              >
                {ocrStatus === "running" ? "OCR In Progress..." : "Run OCR & Add Text Layers"}
              </button>
            </div>
          </ToolPanel>

          <ToolPanel title="Add Text Layer" description="Insert additional text manually and fine-tune style before placing.">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-400">Text</span>
                <input
                  type="text"
                  value={newText}
                  onChange={(event) => setNewText(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Font Size</span>
                <input
                  type="number"
                  min={8}
                  max={220}
                  value={newFontSize}
                  onChange={(event) => setNewFontSize(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Color</span>
                <input
                  type="color"
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-400">Font Family</span>
                <select
                  value={newFontFamily}
                  onChange={(event) => setNewFontFamily(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60"
                >
                  {FONT_FAMILIES.map((fontName) => (
                    <option key={fontName} value={fontName}>
                      {fontName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={addTextLayer}
              disabled={!file || isInitializingCanvas}
              className="mt-4 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
            >
              Add Text Layer
            </button>
          </ToolPanel>

          {hasSelectedText ? (
            <ToolPanel title="Edit Selected Text Layer" description="Select a layer on canvas, update it, then apply changes.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-400">Text</span>
                  <input
                    type="text"
                    value={selectedText}
                    onChange={(event) => setSelectedText(event.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-400">Font Size</span>
                  <input
                    type="number"
                    min={8}
                    max={220}
                    value={selectedFontSize}
                    onChange={(event) => setSelectedFontSize(Number(event.target.value))}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-400">Color</span>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(event) => setSelectedColor(event.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-400">Font Family</span>
                  <select
                    value={selectedFontFamily}
                    onChange={(event) => setSelectedFontFamily(event.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60"
                  >
                    {FONT_FAMILIES.map((fontName) => (
                      <option key={fontName} value={fontName}>
                        {fontName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={applySelectedTextChanges}
                  className="rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                >
                  Apply Changes
                </button>
                <button
                  type="button"
                  onClick={removeSelectedTextLayer}
                  className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/20"
                >
                  Remove Layer
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">AI Rewrite</p>
                <textarea
                  value={aiInstruction}
                  onChange={(event) => setAiInstruction(event.target.value)}
                  placeholder="Describe how to rewrite selected text..."
                  className="mt-2 min-h-18 w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => void rewriteSelectedTextWithAi()}
                  disabled={isAiRewriting}
                  className="mt-2 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-4 py-2 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
                >
                  {isAiRewriting ? "Rewriting..." : "AI Rewrite Selected Text"}
                </button>
                {aiError ? <p className="mt-2 text-xs text-rose-100">{aiError}</p> : null}
              </div>
            </ToolPanel>
          ) : null}

          {statusMessage ? (
            <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {statusMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void download()}
            disabled={!file || isInitializingCanvas}
            className="rounded-xl bg-linear-to-r from-emerald-300 to-teal-300 px-6 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
          >
            Download Edited Image
          </button>
        </div>

        <div className="space-y-4">
          <ToolPanel title="Tips">
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• Run OCR first to convert detected text into editable layers</li>
              <li>• Select any text on the canvas to edit or remove it</li>
              <li>• Drag text boxes freely to align with source content</li>
              <li>• Everything runs locally in your browser</li>
            </ul>
          </ToolPanel>
        </div>
      </div>
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </ToolPageShell>
  );
}
