"use client";

import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";

interface ProcessingIndicatorProps {
  title?: string;
  description?: string;
}

export default function ProcessingIndicator({
  title = "Processing your file...",
  description = "Applying edits and optimizing export quality.",
}: ProcessingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="animate-spin text-cyan-200" size={18} />
      <div>
        <p className="text-sm font-medium text-cyan-100">{title}</p>
        <p className="text-xs text-cyan-100/80">{description}</p>
      </div>
    </motion.div>
  );
}
