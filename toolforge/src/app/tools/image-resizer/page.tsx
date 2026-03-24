"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useRef, useState } from "react";

type ResizeMode = "pixels" | "percentage";
type OutputFormat = "original" | "jpeg" | "png" | "webp";

export default function ImageResizerPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("image-resizer");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [origDims, setOrigDims] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<ResizeMode>("pixels");
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [percent, setPercent] = useState(50);
  const [keepRatio, setKeepRatio] = useState(true);
  const [format, setFormat] = useState<OutputFormat>("original");
  const [result, setResult] = useState<{ dataUrl: string; filename: string; w: number; h: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadImage = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please select an image file."); return; }
    setFile(f); setResult(null); setError(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      setOrigDims({ w: img.naturalWidth, h: img.naturalHeight });
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
    };
    img.src = url;
  };

  const handleWidthChange = (v: number) => {
    setWidth(v);
    if (keepRatio && origDims.w > 0) setHeight(Math.round((v / origDims.w) * origDims.h));
  };
  const handleHeightChange = (v: number) => {
    setHeight(v);
    if (keepRatio && origDims.h > 0) setWidth(Math.round((v / origDims.h) * origDims.w));
  };

  const resize = async () => {
    if (!file || !preview || remainingUses <= 0) return;
    setIsProcessing(true); setError(null);
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = preview; });
      const targetW = mode === "percentage" ? Math.round((origDims.w * percent) / 100) : width;
      const targetH = mode === "percentage" ? Math.round((origDims.h * percent) / 100) : height;
      const canvas = document.createElement("canvas");
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const mimeMap: Record<OutputFormat, string> = {
        original: file.type || "image/png",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      const mime = mimeMap[format];
      const ext = mime.split("/")[1];
      const dataUrl = canvas.toDataURL(mime, 0.92);
      await incrementUsage();
      setResult({
        dataUrl,
        filename: file.name.replace(/\.[^.]+$/, "") + `_${targetW}x${targetH}.${ext}`,
        w: targetW,
        h: targetH,
      });
    } catch {
      setError("Resize failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="Image Resizer"
      description="Resize images to exact pixel dimensions or a percentage of the original size."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Upload Image">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadImage(f); }}
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
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0])} />
            </div>
            {origDims.w > 0 && <p className="mt-2 text-xs text-slate-500">Original: {origDims.w} × {origDims.h} px</p>}
          </ToolPanel>

          {file && (
            <ToolPanel title="Resize Settings">
              <div className="flex gap-3 mb-4">
                {(["pixels", "percentage"] as ResizeMode[]).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mode === m ? "bg-cyan-300 text-slate-900" : "border border-white/15 text-slate-300 hover:border-cyan-300/40"}`}
                  >{m === "pixels" ? "By Pixels" : "By Percentage"}</button>
                ))}
              </div>

              {mode === "pixels" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-400">Width (px)</span>
                    <input type="number" min={1} value={width} onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-400">Height (px)</span>
                    <input type="number" min={1} value={height} onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/60" />
                  </label>
                  <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={keepRatio} onChange={(e) => setKeepRatio(e.target.checked)} className="accent-cyan-300" />
                    Lock aspect ratio
                  </label>
                </div>
              ) : (
                <label className="block space-y-2">
                  <span className="flex items-center justify-between text-sm text-slate-300">
                    <span>Scale</span><span className="font-semibold text-cyan-300">{percent}%</span>
                  </span>
                  <input type="range" min={1} max={200} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="w-full accent-cyan-300" />
                </label>
              )}

              <div className="mt-4">
                <p className="mb-2 text-xs text-slate-400">Output Format</p>
                <div className="flex flex-wrap gap-2">
                  {(["original", "jpeg", "png", "webp"] as OutputFormat[]).map((f) => (
                    <button key={f} type="button" onClick={() => setFormat(f)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${format === f ? "bg-cyan-300 text-slate-900" : "border border-white/15 text-slate-300 hover:border-cyan-300/40"}`}
                    >{f}</button>
                  ))}
                </div>
              </div>

              {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</p>}

              <button
                type="button"
                onClick={() => void resize()}
                disabled={isProcessing || remainingUses <= 0}
                className="mt-5 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
              >
                {isProcessing ? "Resizing…" : "Resize Image"}
              </button>
            </ToolPanel>
          )}

          {result && (
            <ToolPanel title="Result">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.dataUrl} alt="Resized" className="max-h-72 w-full rounded-xl object-contain" />
              <p className="mt-2 text-xs text-slate-400">{result.w} × {result.h} px</p>
              <a
                href={result.dataUrl}
                download={result.filename}
                className="mt-4 inline-block rounded-xl bg-linear-to-r from-emerald-300 to-teal-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
              >
                Download Resized Image
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
