"use client";

import type { ToolDefinition } from "@/lib/types";
import { liveToolSlugs } from "@/lib/tools";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import {
  Binary,
  FileCode2,
  FileText,
  Fingerprint,
  ImageIcon,
  Languages,
  Minimize2,
  MoveDiagonal,
  ScanText,
  ShieldEllipsis,
  Sparkles,
  QrCode,
  Split,
  Type,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";

interface ToolCardProps {
  tool: ToolDefinition;
  priority?: boolean;
}

const iconMap = {
  image: ImageIcon,
  resize: MoveDiagonal,
  scan: ScanText,
  convert: WandSparkles,
  textImage: Languages,
  pdfEdit: FileText,
  merge: FileCode2,
  split: Split,
  compress: Minimize2,
  word: Type,
  case: Sparkles,
  json: Binary,
  password: ShieldEllipsis,
  uuid: Fingerprint,
  qr: QrCode,
};

export default function ToolCard({ tool, priority = false }: ToolCardProps) {
  const Icon = iconMap[tool.icon];
  const isLive = liveToolSlugs.has(tool.slug);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/12 bg-white/6 p-5 shadow-xl shadow-black/30 backdrop-blur-xl",
        priority && "border-cyan-300/30 bg-cyan-300/10",
      )}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-slate-900/70 text-cyan-200">
            <Icon size={18} />
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
            {tool.category}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-white">{tool.name}</h3>
        <p className="mt-2 text-sm text-slate-300">{tool.description}</p>

        <Link
          href={isLive ? `/tools/${tool.slug}` : "#"}
          aria-disabled={!isLive}
          className={cn(
            "mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
            isLive
              ? "bg-cyan-300/20 text-cyan-100 hover:bg-cyan-300/30"
              : "cursor-not-allowed bg-white/10 text-slate-300",
          )}
        >
          {isLive ? "Open Tool" : "Coming Soon"}
        </Link>
      </div>
    </motion.article>
  );
}
