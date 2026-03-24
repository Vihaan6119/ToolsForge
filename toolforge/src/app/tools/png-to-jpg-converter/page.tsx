"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useRef, useState } from "react";

export default function PngToJpgPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("png-to-jpg-converter");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [quality, setQuality] = useState(92);
  const [result, setResult] = useState<{ dataUrl: string; filename: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please select an image file."); return; }
    setFile(f); setResult(null); setError(null);
    setPreview(URL.createObjectURL(f));
  };

  const convert = async () => {
    if (!file || !preview || remainingUses <= 0) return;
    setIsProcessing(true); setError(null);
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = preview; });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", quality / 100);
      await incrementUsage();
      setResult({ dataUrl, filename: file.name.replace(/\.[^.]+$/, "") + ".jpg" });
    } catch {
      setError("Conversion failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="PNG to JPG Converter"
      description="Convert transparent PNG files to JPG with a custom background color."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Upload PNG Image" description="Any image format is accepted; the output will be JPEG.">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/18 bg-slate-950/50 transition hover:border-cyan-300/50 hover:bg-slate-900/50"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="max-h-40 rounded-xl object-contain" />
              ) : (
                <>
                  <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm text-slate-300">Drag & drop or click to select</p>
                </>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            </div>
          </ToolPanel>

          {file && (
            <ToolPanel title="Conversion Settings">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Background Color</span>
                  <div className="flex items-center gap-3">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent" />
                    <span className="text-sm font-mono text-slate-400">{bgColor.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-500">Fills transparent PNG regions</p>
                </label>
                <label className="space-y-2">
                  <span className="flex items-center justify-between text-sm text-slate-300">
                    <span>JPG Quality</span>
                    <span className="font-semibold text-cyan-300">{quality}%</span>
                  </span>
                  <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-cyan-300" />
                </label>
              </div>

              {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</p>}

              <button
                type="button"
                onClick={() => void convert()}
                disabled={isProcessing || remainingUses <= 0}
                className="mt-5 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
              >
                {isProcessing ? "Converting…" : "Convert to JPG"}
              </button>
            </ToolPanel>
          )}

          {result && (
            <ToolPanel title="Result">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.dataUrl} alt="Converted" className="max-h-72 w-full rounded-xl object-contain" />
              <a
                href={result.dataUrl}
                download={result.filename}
                className="mt-4 inline-block rounded-xl bg-linear-to-r from-emerald-300 to-teal-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
              >
                Download JPG
              </a>
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
