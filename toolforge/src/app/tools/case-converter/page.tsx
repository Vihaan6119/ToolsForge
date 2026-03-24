"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useState } from "react";

function toTitleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSentenceCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (segment) => segment.toUpperCase());
}

function toCamelCase(value: string) {
  const words = value.toLowerCase().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return words
    .map((word, index) => (index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join("");
}

function toDelimitedCase(value: string, delimiter: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .join(delimiter);
}

const transforms = {
  uppercase: (value: string) => value.toUpperCase(),
  lowercase: (value: string) => value.toLowerCase(),
  title: toTitleCase,
  sentence: toSentenceCase,
  camel: toCamelCase,
  snake: (value: string) => toDelimitedCase(value, "_"),
  kebab: (value: string) => toDelimitedCase(value, "-"),
} as const;

export default function CaseConverterPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("case-converter");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const applyTransform = async (mode: keyof typeof transforms) => {
    if (!input.trim() || remainingUses <= 0) {
      return;
    }

    setOutput(transforms[mode](input));
    await incrementUsage();
  };

  return (
    <ToolPageShell
      title="Case Converter"
      description="Transform text between uppercase, lowercase, title case, sentence case, camelCase, snake_case, and kebab-case locally in the browser."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Input Text" description="Paste text once, then convert it into different formats.">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste text to convert..."
              className="min-h-64 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(transforms).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => void applyTransform(mode as keyof typeof transforms)}
                  disabled={!input.trim() || remainingUses <= 0}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/15 disabled:opacity-45"
                >
                  {mode}
                </button>
              ))}
            </div>
          </ToolPanel>

          <ToolPanel title="Converted Output">
            <textarea
              value={output}
              readOnly
              placeholder="Converted text appears here..."
              className="min-h-64 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            />
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