"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useRef, useState } from "react";

interface CompressResult {
  originalSize: number;
  compressedSize: number;
  savings: number;
  dataUrl: string;
  filename: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageCompressorPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("image-compressor");

  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(80);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const compress = async () => {
    if (!file || remainingUses <= 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const imageCompression = (await import("browser-image-compression")).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: 10,
        initialQuality: quality / 100,
        useWebWorker: true,
      });

      const reader = new FileReader();
      reader.onload = async () => {
        await incrementUsage();
        setResult({
          originalSize: file.size,
          compressedSize: compressed.size,
          savings: Math.max(0, Math.round(((file.size - compressed.size) / file.size) * 100)),
          dataUrl: reader.result as string,
          filename: file.name.replace(/\.[^.]+$/, "") + "_compressed." + (compressed.type.split("/")[1] ?? "jpg"),
        });
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setError("Failed to read compressed file.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError("Compression failed. Please try a different image.");
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="Image Compressor"
      description="Reduce image file size while preserving visual quality using client-side compression."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Upload Image" description="Supports JPEG, PNG, WebP, GIF and other common formats.">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/18 bg-slate-950/50 transition hover:border-cyan-300/50 hover:bg-slate-900/50"
            >
              <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-slate-300">{file ? file.name : "Drag & drop or click to select"}</p>
              {file && <p className="mt-1 text-xs text-slate-500">{formatSize(file.size)}</p>}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            <div className="mt-4">
              <label className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Quality</span>
                <span className="font-semibold text-cyan-300">{quality}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-cyan-300"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
            </div>

            {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</p>}

            <button
              type="button"
              onClick={() => void compress()}
              disabled={!file || isProcessing || remainingUses <= 0}
              className="mt-4 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
            >
              {isProcessing ? "Compressing…" : "Compress Image"}
            </button>
          </ToolPanel>

          {result && (
            <ToolPanel title="Result" description="Download your compressed image below.">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.dataUrl} alt="Compressed preview" className="mt-4 max-h-72 w-full rounded-xl object-contain" />
              <a
                href={result.dataUrl}
                download={result.filename}
                className="mt-4 inline-block rounded-xl bg-linear-to-r from-emerald-300 to-teal-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
              >
                Download Compressed Image
              </a>
            </ToolPanel>
          )}
        </div>

        <div className="space-y-4">
          <ToolUsagePanel
            remainingUses={remainingUses}
            isLoading={isLoading}
            isAuthenticated={isAuthenticated}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        </div>
      </div>

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </ToolPageShell>
  );
}
