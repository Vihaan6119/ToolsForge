"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useRef, useState } from "react";

export default function PdfSplitPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("pdf-split");

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeInput, setRangeInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = async (f: File) => {
    if (f.type !== "application/pdf") { setError("Please select a PDF file."); return; }
    setFile(f); setError(null); setPageCount(0);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
    } catch {
      setError("Failed to read PDF. The file may be corrupted.");
    }
  };

  /** Parse range string like "1-3, 5, 7-9" into zero-indexed page arrays */
  const parseRanges = (input: string, total: number): number[][] => {
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.map((part) => {
      const match = /^(\d+)-(\d+)$/.exec(part);
      if (match) {
        const from = Math.max(1, Number(match[1]));
        const to = Math.min(total, Number(match[2]));
        return Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
      }
      const single = parseInt(part, 10);
      if (!isNaN(single) && single >= 1 && single <= total) return [single - 1];
      return [];
    }).filter((arr) => arr.length > 0);
  };

  const split = async () => {
    if (!file || !rangeInput.trim() || remainingUses <= 0) return;
    setIsProcessing(true); setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);
      const ranges = parseRanges(rangeInput, pageCount);
      if (ranges.length === 0) { setError("No valid page ranges found. Use format: 1-3, 5, 7-9"); setIsProcessing(false); return; }

      for (let i = 0; i < ranges.length; i++) {
        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(srcDoc, ranges[i]);
        for (const page of pages) newDoc.addPage(page);
        const outBytes = await newDoc.save();
        const blob = new Blob([outBytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${file.name.replace(/\.pdf$/i, "")}_part${i + 1}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
      await incrementUsage();
    } catch {
      setError("Split failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="PDF Split"
      description="Extract specific pages or ranges from a PDF into separate files."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Upload PDF" description="Select a PDF file to split into parts.">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void loadFile(f); }}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/18 bg-slate-950/50 transition hover:border-cyan-300/50 hover:bg-slate-900/50"
            >
              <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-300">{file ? file.name : "Drop a PDF here or click to select"}</p>
              {pageCount > 0 && <p className="mt-1 text-xs text-cyan-300">{pageCount} pages</p>}
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && void loadFile(e.target.files[0])} />
            </div>
          </ToolPanel>

          {pageCount > 0 && (
            <ToolPanel title="Page Ranges" description={`Specify which pages to extract. Document has ${pageCount} pages.`}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Ranges (e.g. <span className="font-mono text-cyan-300">1-3, 5, 7-9</span>)</span>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder={`e.g. 1-${Math.min(3, pageCount)}, ${Math.min(5, pageCount)}`}
                  className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
                />
              </label>
              <p className="mt-1 text-xs text-slate-500">Each comma-separated range creates a separate PDF download.</p>

              {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</p>}

              <button
                type="button"
                onClick={() => void split()}
                disabled={!rangeInput.trim() || isProcessing || remainingUses <= 0}
                className="mt-5 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
              >
                {isProcessing ? "Splitting…" : "Split PDF"}
              </button>
            </ToolPanel>
          )}
        </div>

        <div className="space-y-4">
          <ToolUsagePanel remainingUses={remainingUses} isLoading={isLoading} isAuthenticated={isAuthenticated} onOpenAuth={() => setIsAuthModalOpen(true)} />
          <ToolPanel title="Quick Tips">
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• <span className="font-mono text-slate-300">1-3</span> → pages 1, 2, 3 in one file</li>
              <li>• <span className="font-mono text-slate-300">1-3, 5, 7-9</span> → three separate files</li>
              <li>• Each range downloads as a separate PDF</li>
              <li>• All processing happens in your browser</li>
            </ul>
          </ToolPanel>
        </div>
      </div>
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </ToolPageShell>
  );
}
