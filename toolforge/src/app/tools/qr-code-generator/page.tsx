"use client";

import AuthModal from "@/components/auth-modal";
import ToolPageShell from "@/components/tools/tool-page-shell";
import ToolPanel from "@/components/tools/tool-panel";
import ToolUsagePanel from "@/components/tools/tool-usage-panel";
import { useToolUsage } from "@/hooks/use-tool-usage";
import QRCode from "qrcode";
import Image from "next/image";
import { useState } from "react";

export default function QrCodeGeneratorPage() {
  const { remainingUses, incrementUsage, isAuthenticated, isLoading } = useToolUsage("qr-code-generator");

  const [input, setInput] = useState("");
  const [size, setSize] = useState(280);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const generate = async () => {
    if (!input.trim() || remainingUses <= 0) {
      return;
    }

    setError(null);

    try {
      const nextDataUrl = await QRCode.toDataURL(input.trim(), {
        width: size,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });

      setQrDataUrl(nextDataUrl);
      await incrementUsage();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to generate QR code.";
      setError(message);
    }
  };

  return (
    <ToolPageShell
      title="QR Code Generator"
      description="Generate a sharable QR code for URLs, text, or contact data entirely in the browser."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-6">
          <ToolPanel title="QR Input">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="https://toolforge.app"
              className="min-h-40 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
            />

            <label className="mt-4 block text-sm text-slate-300">
              Size: <span className="font-semibold text-white">{size}px</span>
              <input
                type="range"
                min={160}
                max={512}
                step={16}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={!input.trim() || remainingUses <= 0}
              className="mt-4 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 disabled:opacity-45"
            >
              Generate QR Code
            </button>

            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </ToolPanel>

          <ToolPanel title="QR Output">
            {qrDataUrl ? (
              <div className="flex flex-col items-center gap-4">
                <Image src={qrDataUrl} alt="Generated QR code" width={size} height={size} className="rounded-2xl bg-white p-4" />
                <a
                  href={qrDataUrl}
                  download="toolforge-qr-code.png"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Download PNG
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-300">Generate a QR code to preview and download it here.</p>
            )}
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