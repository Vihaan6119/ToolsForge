"use client";

import SectionHeading from "@/components/ui/section-heading";
import ToolCard from "@/components/ui/tool-card";
import { popularTools } from "@/lib/tools";
import { motion } from "framer-motion";

export default function PopularToolsSection() {
  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="Most Used"
        title="Popular Among Power Users"
        description="These tools lead daily workflows for students, teams, and builders who need clean output with minimal clicks."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {popularTools.map((tool, index) => (
          <motion.div
            key={tool.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
          >
            <ToolCard tool={tool} priority />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
