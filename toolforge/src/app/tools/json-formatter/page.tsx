"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useState } from "react";

export default function JsonFormatterPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("json-formatter");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const runAction = async (mode: "format" | "minify" | "validate") => {
    if (!input.trim() || remainingUses <= 0) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const parsed = JSON.parse(input);

      if (mode === "format") {
        setOutput(JSON.stringify(parsed, null, 2));
        setStatus("JSON formatted successfully.");
      } else if (mode === "minify") {
        setOutput(JSON.stringify(parsed));
        setStatus("JSON minified successfully.");
      } else {
        setOutput(JSON.stringify(parsed, null, 2));
        setStatus("JSON is valid.");
      }

      await incrementUsage();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Invalid JSON.";
      setError(message);
    }
  };

  return (
    <ToolPageShell
      title="JSON Formatter"
      description="Format, minify, and validate JSON payloads locally without sending anything off-device."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="JSON Input" description="Paste raw JSON from APIs, config files, or logs.">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder='{"name":"ToolForge"}'
              className="min-h-72 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {(["format", "minify", "validate"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => void runAction(mode)}
                  disabled={!input.trim() || remainingUses <= 0}
                  className="rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-4 py-2 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
                >
                  {mode}
                </button>
              ))}
            </div>
          </ToolPanel>

          <ToolPanel title="Output">
            {status ? <p className="mb-3 text-sm text-emerald-300">{status}</p> : null}
            {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
            <textarea
              value={output}
              readOnly
              placeholder="Processed JSON appears here..."
              className="min-h-72 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 font-mono text-sm text-white outline-none"
            />
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