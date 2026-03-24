"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useMemo, useState } from "react";

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function WordCounterPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("word-counter");

  const [input, setInput] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const metrics = useMemo(() => {
    const words = countWords(input);
    const characters = input.length;
    const charactersNoSpaces = input.replace(/\s/g, "").length;
    const sentences = input.split(/[.!?]+/).filter((segment) => segment.trim().length > 0).length;
    const paragraphs = input.split(/\n\s*\n/).filter((segment) => segment.trim().length > 0).length;
    const readingMinutes = words / 200;

    return {
      words,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTime: words === 0 ? "0 min" : readingMinutes < 1 ? "<1 min" : `${Math.ceil(readingMinutes)} min`,
    };
  }, [input]);

  const analyze = async () => {
    if (!input.trim() || remainingUses <= 0) {
      return;
    }

    await incrementUsage();
    setHasAnalyzed(true);
  };

  return (
    <ToolPageShell
      title="Word Counter"
      description="Count words, characters, sentences, paragraphs, and reading time with a fast local analysis flow."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Analyze Text" description="Paste writing, essays, captions, or notes and run a local count.">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste or type your text here..."
              className="min-h-72 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
            />
            <button
              type="button"
              onClick={() => void analyze()}
              disabled={!input.trim() || remainingUses <= 0}
              className="mt-4 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
            >
              Analyze Text
            </button>
          </ToolPanel>

          <ToolPanel title="Results" description="Counts update from the last successful analysis action.">
            {hasAnalyzed ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(metrics).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{String(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">Run an analysis to view word and reading metrics.</p>
            )}
          </ToolPanel>
        </div>

        <ToolUsagePanel
          remainingUses={remainingUses}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      </div>

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </ToolPageShell>
  );
}