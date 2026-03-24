"use client";

import { useAi } from "@/hooks/use-ai";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, LoaderCircle, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

interface AiAssistantProps {
  toolContext?: string;
  className?: string;
}

function buildSystemPrompt(toolContext?: string) {
  const context = toolContext?.trim();
  const contextLine = context
    ? `Tool context: ${context}. Keep answers focused on this tool and its likely user tasks.`
    : "Tool context: general ToolForge assistance across image, PDF, and text workflows.";

  return [
    "You are ToolForge Assistant, a concise and practical helper for creators.",
    contextLine,
    "Respond with clear steps, short explanations, and user-safe guidance.",
    "If details are uncertain, say so clearly and propose a concrete next check.",
  ].join(" ");
}

export default function AiAssistant({ toolContext, className }: AiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  const systemPrompt = useMemo(() => buildSystemPrompt(toolContext), [toolContext]);

  const { isLoading, error, generate, clearError } = useAi({
    onSuccess: (nextResponse) => {
      setResponse(nextResponse);
    },
  });

  const canSubmit = prompt.trim().length > 0 && !isLoading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    clearError();
    await generate({
      prompt,
      system: systemPrompt,
      temperature: 0.45,
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "rounded-3xl border border-white/12 bg-white/5 p-5 shadow-2xl shadow-cyan-950/25 backdrop-blur-xl sm:p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
            <Bot size={13} />
            Local AI Assistant
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Ask DeepSeek for help</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Running fully on your machine through Ollama. Use it for guided edits, troubleshooting, and workflow tips.
          </p>
        </div>

        <span className="hidden rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-2 text-cyan-100 sm:inline-flex">
          <Sparkles size={16} />
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-slate-300">Your prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Give me step-by-step instructions to add a signature and highlight key text in this PDF."
            className="min-h-30 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">{toolContext ? `Context: ${toolContext}` : "Context: General assistance"}</p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isLoading ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isLoading ? "Thinking..." : "Generate Reply"}
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="ai-error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-4"
          >
            <p className="text-sm font-semibold text-rose-100">Could not generate a response</p>
            <p className="mt-1 text-sm text-rose-100/90">{error}</p>
            <p className="mt-2 text-xs text-rose-100/80">
              If Ollama is offline, run <span className="font-mono">ollama serve</span> and retry.
            </p>
          </motion.div>
        ) : null}

        {!error && response ? (
          <motion.div
            key="ai-response"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-2xl border border-cyan-300/25 bg-slate-900/80 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Assistant response</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{response}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}