"use client";

import SectionHeading from "@/components/ui/section-heading";
import { motion } from "framer-motion";
import { LockKeyhole, Rocket, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Privacy-First Processing",
    description: "Files are processed with secure handling and auto-cleanup to keep your data safe.",
  },
  {
    icon: Rocket,
    title: "Blazing Fast Tools",
    description: "Optimized pipelines deliver exports in seconds, even on mobile networks.",
  },
  {
    icon: LockKeyhole,
    title: "Free Everyday Essentials",
    description: "Powerful core tools stay free so anyone can build, edit, and share quickly.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="space-y-8">
      <SectionHeading
        eyebrow="Why ToolForge"
        title="Crafted For Speed, Security, and Simplicity"
        description="Every interaction is designed to feel immediate and intuitive, from first upload to final export."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: index * 0.08, duration: 0.32 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
              <feature.icon size={18} />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
