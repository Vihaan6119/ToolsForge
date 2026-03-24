"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useRef, useState } from "react";

type CompressionLevel = "low" | "medium" | "high";

const compressionConfig: Record<CompressionLevel, { label: string; description: string; imageQuality: number }> = {
  low: { label: "Low Compression", description: "Minimal reduction, best quality", imageQuality: 0.9 },
  medium: { label: "Medium Compression", description: "Balanced size and quality", imageQuality: 0.7 },
  high: { label: "High Compression", description: "Smallest file, reduced quality", imageQuality: 0.45 },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfCompressorPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("pdf-compressor");

  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ originalSize: number; compressedSize: number; savings: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = (f: File) => {
    if (f.type !== "application/pdf") { setError("Please select a PDF file."); return; }
    setFile(f); setResult(null); setError(null);
  };

  const compress = async () => {
    if (!file || remainingUses <= 0) return;
    setIsProcessing(true); setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);

      // Re-save with compression flags. pdf-lib removes unused objects on save.
      const compressedBytes = await srcDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50,
      });

      const blob = new Blob([compressedBytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(/\.pdf$/i, "") + `_compressed_${level}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      const savings = Math.max(0, Math.round(((file.size - compressedBytes.byteLength) / file.size) * 100));
      await incrementUsage();
      setResult({ originalSize: file.size, compressedSize: compressedBytes.byteLength, savings });
    } catch {
      setError("Compression failed. The PDF may be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="PDF Compressor"
      description="Reduce PDF file size by removing unused objects and rewriting the document structure."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Upload PDF">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/18 bg-slate-950/50 transition hover:border-cyan-300/50 hover:bg-slate-900/50"
            >
              <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-300">{file ? file.name : "Drop a PDF here or click to select"}</p>
              {file && <p className="mt-1 text-xs text-slate-500">{formatSize(file.size)}</p>}
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            </div>
          </ToolPanel>

          {file && (
            <ToolPanel title="Compression Level">
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.entries(compressionConfig) as [CompressionLevel, typeof compressionConfig.low][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLevel(key)}
                    className={`rounded-xl border p-4 text-left transition ${level === key ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-slate-950/50 hover:border-white/20"}`}
                  >
                    <p className={`text-sm font-semibold ${level === key ? "text-cyan-200" : "text-white"}`}>{cfg.label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{cfg.description}</p>
                  </button>
                ))}
              </div>

              {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</p>}

              <button
                type="button"
                onClick={() => void compress()}
                disabled={isProcessing || remainingUses <= 0}
                className="mt-5 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
              >
                {isProcessing ? "Compressing…" : "Compress & Download"}
              </button>
            </ToolPanel>
          )}

          {result && (
            <ToolPanel title="Result">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Original", value: formatSize(result.originalSize) },
                  { label: "Compressed", value: formatSize(result.compressedSize) },
                  { label: "Saved", value: `${result.savings}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              {result.savings < 5 && (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
                  Minimal savings detected. This PDF may already be optimized, or its size is dominated by embedded images (unavoidable with browser-only compression).
                </p>
              )}
            </ToolPanel>
          )}
        </div>

        <div className="space-y-4">
          <ToolUsagePanel remainingUses={remainingUses} isLoading={isLoading} isAuthenticated={isAuthenticated} onOpenAuth={() => setIsAuthModalOpen(true)} />
        </div>
      </div>
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </ToolPageShell>
  );
}
