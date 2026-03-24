"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { useMemo, useState } from "react";

function randomItem(value: string) {
  return value[Math.floor(Math.random() * value.length)] ?? "";
}

export default function PasswordGeneratorPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("password-generator");

  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const characterPool = useMemo(() => {
    let value = "";
    if (includeUppercase) value += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLowercase) value += "abcdefghijklmnopqrstuvwxyz";
    if (includeNumbers) value += "0123456789";
    if (includeSymbols) value += "!@#$%^&*()_+-=[]{}<>?";
    return value;
  }, [includeLowercase, includeNumbers, includeSymbols, includeUppercase]);

  const generatePassword = async () => {
    if (!characterPool || remainingUses <= 0) {
      return;
    }

    const nextPassword = Array.from({ length }, () => randomItem(characterPool)).join("");
    setPassword(nextPassword);
    await incrementUsage();
  };

  return (
    <ToolPageShell
      title="Password Generator"
      description="Generate strong passwords locally with custom rules for length, symbols, numbers, and mixed case."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="Password Rules">
            <label className="block text-sm text-slate-300">
              Length: <span className="font-semibold text-white">{length}</span>
            </label>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
              className="mt-2 w-full"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: includeUppercase,
                  setter: setIncludeUppercase,
                  label: "Uppercase letters",
                },
                {
                  value: includeLowercase,
                  setter: setIncludeLowercase,
                  label: "Lowercase letters",
                },
                {
                  value: includeNumbers,
                  setter: setIncludeNumbers,
                  label: "Numbers",
                },
                {
                  value: includeSymbols,
                  setter: setIncludeSymbols,
                  label: "Symbols",
                },
              ].map((option) => (
                <label key={option.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={option.value}
                    onChange={(event) => option.setter(event.target.checked)}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void generatePassword()}
              disabled={!characterPool || remainingUses <= 0}
              className="mt-4 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
            >
              Generate Password
            </button>
          </ToolPanel>

          <ToolPanel title="Generated Password">
            <div className="rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-4 font-mono text-sm text-cyan-100">
              {password || "Generate a password to see it here."}
            </div>
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