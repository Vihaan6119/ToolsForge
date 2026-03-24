"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/45 px-6 py-16 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl sm:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.2),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.15),transparent_40%)]" />
      <motion.div
        className="absolute -left-24 top-8 h-44 w-44 rounded-full bg-cyan-300/30 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 8, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-blue-400/25 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 14, 0] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 10, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          <Zap size={13} />
          Fast tools for the modern web
        </span>
        <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
          Build, convert, and optimize files in seconds with ToolForge.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-slate-300 sm:text-lg">
          A sleek all-in-one platform for image, PDF, and text tools. Privacy-focused processing,
          blazing speed, and a workflow built for everyday creators.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#tools"
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-6 py-3 text-sm font-semibold text-slate-900 shadow-xl shadow-cyan-400/30 transition-transform hover:-translate-y-0.5"
          >
            Explore Tools
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/tools/pdf-editor"
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Open PDF Editor
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
