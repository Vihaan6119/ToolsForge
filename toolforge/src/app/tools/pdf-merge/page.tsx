"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useRef, useState } from "react";

interface PdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfMergePage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("pdf-merge");

  const [items, setItems] = useState<PdfItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    setError(null);
    const newItems: PdfItem[] = [];
    for (const f of Array.from(files)) {
      if (f.type !== "application/pdf") { setError("Only PDF files are supported."); continue; }
      newItems.push({ id: crypto.randomUUID(), file: f, name: f.name, size: f.size });
    }
    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const moveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setItems((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const merge = async () => {
    if (items.length < 2 || remainingUses <= 0) return;
    setIsProcessing(true); setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const item of items) {
        const bytes = await item.file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const indices = doc.getPageIndices();
        const pages = await merged.copyPages(doc, indices);
        for (const page of pages) merged.addPage(page);
      }
      const mergedBytes = await merged.save();
      const blob = new Blob([mergedBytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged.pdf";
      link.click();
      URL.revokeObjectURL(url);
      await incrementUsage();
    } catch {
      setError("Merge failed. Ensure all files are valid PDFs.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="PDF Merge"
      description="Combine multiple PDF files into a single document. Drag files to reorder before merging."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Add PDF Files" description="Select two or more PDFs to merge. They will be combined in the listed order.">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/18 bg-slate-950/50 transition hover:border-cyan-300/50 hover:bg-slate-900/50"
            >
              <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm text-slate-300">Drop PDFs here or click to add</p>
              <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </div>
          </ToolPanel>

          {items.length > 0 && (
            <ToolPanel title={`Files — ${items.length} added`} description="Use the arrows to reorder. The merge output follows this order.">
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-xs font-bold text-cyan-300">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{formatSize(item.size)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveUp(index)} disabled={index === 0}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveDown(index)} disabled={index === items.length - 1}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => removeItem(item.id)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-400/10">✕</button>
                    </div>
                  </li>
                ))}
              </ul>

              {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</p>}

              <button
                type="button"
                onClick={() => void merge()}
                disabled={items.length < 2 || isProcessing || remainingUses <= 0}
                className="mt-5 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
              >
                {isProcessing ? "Merging…" : `Merge ${items.length} PDFs`}
              </button>
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
