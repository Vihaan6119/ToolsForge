"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useState } from "react";

export default function UuidGeneratorPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("uuid-generator");

  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const generate = async () => {
    if (remainingUses <= 0) {
      return;
    }

    const nextValues = Array.from({ length: count }, () => crypto.randomUUID());
    setUuids(nextValues);
    await incrementUsage();
  };

  return (
    <ToolPageShell
      title="UUID Generator"
      description="Generate RFC-compliant UUID v4 identifiers locally for databases, APIs, and development workflows."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Generate UUIDs">
            <label className="block text-sm text-slate-300">
              Count
              <input
                type="number"
                min={1}
                max={25}
                value={count}
                onChange={(event) => setCount(Math.min(25, Math.max(1, Number(event.target.value) || 1)))}
                className="mt-2 w-full rounded-xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
              />
            </label>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={remainingUses <= 0}
              className="mt-4 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
            >
              Generate UUIDs
            </button>
          </ToolPanel>

          <ToolPanel title="UUID Output">
            <div className="space-y-2">
              {uuids.length > 0 ? (
                uuids.map((uuid) => (
                  <div key={uuid} className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-sm text-cyan-100">
                    {uuid}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-300">Generate one or more UUIDs to display them here.</p>
              )}
            </div>
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