"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, X } from "lucide-react";
import { useMemo, useState } from "react";

type AuthMode = "magic-link" | "password";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<AuthMode>("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setMessage(null);
    setError(null);
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError("Enter your email to continue.");
      return;
    }

    setIsSubmitting(true);
    resetState();

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Magic link sent. Check your email inbox.");
    setIsSubmitting(false);
  };

  const handlePasswordSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    resetState();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Signed in successfully.");
    setIsSubmitting(false);
    onClose();
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    resetState();

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Account created. Check email to confirm if required.");
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/90 p-6 shadow-2xl shadow-cyan-950/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Account</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Sign in to ToolForge</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                aria-label="Close auth modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode("magic-link");
                  resetState();
                }}
                className={`rounded-lg px-3 py-2 transition ${
                  mode === "magic-link" ? "bg-cyan-300/20 text-cyan-100" : "text-slate-300 hover:text-white"
                }`}
              >
                Magic Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  resetState();
                }}
                className={`rounded-lg px-3 py-2 transition ${
                  mode === "password" ? "bg-cyan-300/20 text-cyan-100" : "text-slate-300 hover:text-white"
                }`}
              >
                Password
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
              />

              {mode === "password" ? (
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
                />
              ) : null}
            </div>

            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {mode === "magic-link" ? (
                <button
                  type="button"
                  onClick={() => void handleMagicLink()}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : null}
                  Send Magic Link
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handlePasswordSignIn()}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {isSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : null}
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSignUp()}
                    disabled={isSubmitting}
                    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
