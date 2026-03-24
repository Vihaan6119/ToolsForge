"use client";

import ToolCard from "@/components/ui/tool-card";
import SectionHeading from "@/components/ui/section-heading";
import { categoryFilters, tools } from "@/lib/tools";
import type { ToolCategoryFilter } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

export default function ToolsGridSection() {
  const [activeFilter, setActiveFilter] = useState<ToolCategoryFilter>("All");

  const filteredTools = useMemo(() => {
    if (activeFilter === "All") {
      return tools;
    }

    return tools.filter((tool) => tool.category === activeFilter);
  }, [activeFilter]);

  return (
    <section id="tools" className="space-y-8">
      <SectionHeading
        eyebrow="Tool Directory"
        title="Everything You Need, In One Intelligent Workspace"
        description="Switch between image, PDF, text, and utility tools without friction. Every utility is built for speed, clarity, and high-quality output."
      />

      <div className="flex flex-wrap gap-2">
        {categoryFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              activeFilter === filter
                ? "border-cyan-300/70 bg-cyan-300/20 text-cyan-100"
                : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool) => (
            <motion.div
              key={tool.slug}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <ToolCard tool={tool} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
