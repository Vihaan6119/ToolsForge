"use client";

import SectionHeading from "@/components/ui/section-heading";
import { motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { useState } from "react";

const freeFeatures = [
  "3 free uses per premium tool",
  "Core image, PDF, and text utilities",
  "Fast cloud processing",
  "Community support",
];

const premiumFeatures = [
  "Unlimited uses on every tool",
  "No watermark on exported files",
  "Priority processing queue",
  "Advanced editing controls",
  "Priority support",
];

export default function PricingSection() {
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  return (
    <>
      <section id="pricing" className="space-y-8">
        <SectionHeading
          centered
          eyebrow="Simple Pricing"
          title="Start Free, Upgrade Only When You Need More"
          description="ToolForge keeps essentials free forever, while premium unlocks unlimited high-volume workflows."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="rounded-2xl border border-white/12 bg-white/5 p-6"
          >
            <h3 className="text-xl font-semibold text-white">Free Plan</h3>
            <p className="mt-1 text-sm text-slate-300">For occasional users and quick tasks.</p>
            <p className="mt-5 text-4xl font-semibold text-white">
              $0 <span className="text-base font-medium text-slate-300">/ forever</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCheck size={16} className="mt-0.5 text-cyan-200" />
                  {feature}
                </li>
              ))}
            </ul>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-cyan-300/35 bg-linear-to-br from-cyan-300/20 via-blue-300/10 to-transparent p-6 shadow-xl shadow-cyan-950/50"
          >
            <span className="inline-flex rounded-full border border-cyan-100/30 bg-cyan-200/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Recommended
            </span>
            <h3 className="mt-3 text-xl font-semibold text-white">Premium Plan</h3>
            <p className="mt-1 text-sm text-slate-200">For creators, teams, and high-frequency workflows.</p>
            <p className="mt-5 text-4xl font-semibold text-white">
              $9 <span className="text-base font-medium text-slate-200">/ month</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-100">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCheck size={16} className="mt-0.5 text-cyan-100" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(true)}
              className="mt-7 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
            >
              Upgrade Now
            </button>
          </motion.article>
        </div>
      </section>

      {isPlanModalOpen ? (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-950/92 p-6 shadow-2xl shadow-cyan-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Premium Preview</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Premium checkout is coming soon</h3>
            <p className="mt-3 text-sm text-slate-300">
              You can review the plan today, and subscription checkout will be enabled in a future release.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              <li>Unlimited uses across premium tools</li>
              <li>No watermark on exported files</li>
              <li>Priority processing and support</li>
            </ul>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 opacity-50"
                aria-disabled="true"
              >
                Subscribe (Coming Soon)
              </button>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
