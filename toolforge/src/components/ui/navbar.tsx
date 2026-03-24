"use client";

import AuthModal from "@/components/auth-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { Hammer, LoaderCircle, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const navItems = [
  { label: "Tools", href: "#tools" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (active) {
          setUser(authUser ?? null);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  };

  const avatarLabel = user?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-4 z-50 mx-auto mb-8 w-[min(1120px,92vw)]"
      >
        <nav className="glass-panel flex items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-lg shadow-cyan-400/40">
              <Hammer size={18} />
            </span>
            <span className="text-sm font-semibold tracking-wide sm:text-base">ToolForge</span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition-colors duration-200 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/tools/pdf-editor"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-all hover:border-cyan-300/60 hover:bg-cyan-400/20 sm:px-4 sm:text-sm"
            >
              <Sparkles size={14} />
              Try PDF Editor
            </Link>

            {isAuthLoading ? (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-slate-300">
                <LoaderCircle size={15} className="animate-spin" />
              </span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span
                  title={user.email ?? "ToolForge user"}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/20 text-sm font-semibold text-cyan-50"
                >
                  {avatarLabel}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/14 disabled:opacity-50"
                >
                  {isSigningOut ? <LoaderCircle size={14} className="animate-spin" /> : <LogOut size={14} />}
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 sm:px-4 sm:text-sm"
              >
                Sign in
              </button>
            )}
          </div>
        </nav>
      </motion.header>

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
