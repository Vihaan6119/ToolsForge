"use client";

import { motion } from "framer-motion";
import { Crown, Zap } from "lucide-react";
import Link from "next/link";

interface PremiumBannerProps {
  remainingUses: number;
}

export default function PremiumBanner({ remainingUses }: PremiumBannerProps) {
  const exhausted = remainingUses <= 0;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-amber-300/30 bg-linear-to-br from-amber-400/15 via-amber-200/5 to-transparent p-5"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-amber-100/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
            <Crown size={12} />
            Premium Access
          </p>
          <h3 className="mt-3 text-lg font-semibold text-white">
            {exhausted ? "Free limit reached" : "Upgrade before your free limit ends"}
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            {exhausted
              ? "Get unlimited exports, watermark-free files, and faster processing."
              : `Only ${remainingUses} free use${remainingUses === 1 ? "" : "s"} left on this tool.`}
          </p>
        </div>

        <span className="rounded-xl bg-amber-300/15 p-3 text-amber-100">
          <Zap size={20} />
        </span>
      </div>

      <Link
        href="/pricing"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-amber-300 to-orange-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-300/30 transition-transform hover:-translate-y-0.5"
      >
        Upgrade to Premium
      </Link>
    </motion.aside>
  );
}
