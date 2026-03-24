"use client";

import PremiumBanner from "@/components/ui/premium-banner";

interface ToolUsagePanelProps {
  remainingUses: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

export default function ToolUsagePanel({
  remainingUses,
  isLoading,
  isAuthenticated,
  onOpenAuth,
}: ToolUsagePanelProps) {
  const isLimited = Number.isFinite(remainingUses);
  const limitReached = isLimited && remainingUses <= 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Freemium</p>
        <p className="mt-2 text-3xl font-semibold text-white">{isLoading ? "..." : isLimited ? remainingUses : "Unlimited"}</p>
        <p className="mt-1 text-sm text-slate-300">
          {isLimited
            ? "Free uses left for this tool before premium gating appears."
            : "This tool is unlimited and does not consume freemium credits."}
        </p>
      </section>

      {limitReached ? <PremiumBanner remainingUses={remainingUses} /> : null}

      {limitReached && !isAuthenticated ? (
        <section className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-5">
          <p className="text-sm font-semibold text-cyan-100">Sign in to sync your usage across devices</p>
          <p className="mt-1 text-xs text-cyan-100/80">
            Keep your free credits and premium status consistent across desktop and mobile.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="mt-3 rounded-xl border border-cyan-200/35 bg-cyan-200/15 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-200/25"
          >
            Sign in now
          </button>
        </section>
      ) : null}
    </div>
  );
}