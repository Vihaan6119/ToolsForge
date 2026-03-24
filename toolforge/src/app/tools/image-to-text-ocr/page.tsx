"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useRef, useState } from "react";

type OcrStatus = "idle" | "loading" | "done" | "error";

export default function ImageToTextPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("image-to-text-ocr");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOcrStatus("idle");
    setExtractedText("");
    setOcrProgress(0);
  };

  const runOcr = async () => {
    if (!file || remainingUses <= 0) return;
    setOcrStatus("loading");
    setOcrProgress(0);
    try {
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(file, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      await incrementUsage();
      setExtractedText(data.text.trim());
      setOcrStatus("done");
    } catch {
      setOcrStatus("error");
    }
  };

  const copyText = () => {
    void navigator.clipboard.writeText(extractedText);
  };

  return (
    <ToolPageShell
      title="Image to Text (OCR)"
      description="Extract editable text from photos, scanned documents, and screenshots using local OCR."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Upload Image" description="Upload a clear photo or scanned document for best results.">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/18 bg-slate-950/50 transition hover:border-cyan-300/50 hover:bg-slate-900/50"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="max-h-48 rounded-xl object-contain" />
              ) : (
                <>
                  <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-slate-300">Drag & drop or click to select an image</p>
                </>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            </div>

            {ocrStatus === "loading" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Extracting text…</span><span>{ocrProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-300 transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}

            {ocrStatus === "error" && (
              <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">OCR failed. Please try a clearer image.</p>
            )}

            <button
              type="button"
              onClick={() => void runOcr()}
              disabled={!file || ocrStatus === "loading" || remainingUses <= 0}
              className="mt-4 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
            >
              {ocrStatus === "loading" ? "Extracting…" : "Extract Text"}
            </button>
          </ToolPanel>

          {ocrStatus === "done" && (
            <ToolPanel title="Extracted Text" description="Review and copy the recognized text below.">
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="min-h-48 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
              />
              <button
                type="button"
                onClick={copyText}
                className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
              >
                Copy to Clipboard
              </button>
            </ToolPanel>
          )}
        </div>

        <div className="space-y-4">
          <ToolUsagePanel remainingUses={remainingUses} isLoading={isLoading} isAuthenticated={isAuthenticated} onOpenAuth={() => setIsAuthModalOpen(true)} />
          <ToolPanel title="Tips">
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• Use high-contrast, well-lit images for best accuracy</li>
              <li>• Printed or typed text works better than handwriting</li>
              <li>• First run downloads the OCR language model (~10 MB)</li>
              <li>• Processing runs entirely in your browser</li>
            </ul>
          </ToolPanel>
        </div>
      </div>
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </ToolPageShell>
  );
}
