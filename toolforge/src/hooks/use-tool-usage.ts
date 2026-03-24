"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

const FREE_LIMIT = 3;
const STORAGE_PREFIX = "toolforge:usage";
const RESTRICTED_TOOL_SLUGS = new Set<string>([]);
const TESTING_UNLIMITED_USAGE = true;
const TESTING_REMAINING_USES = 9999;

interface UseToolUsageResult {
  remainingUses: number;
  incrementUsage: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLimited: boolean;
}

function getStorageKey(toolSlug: string) {
  return `${STORAGE_PREFIX}:${toolSlug}`;
}

function parseCount(value: string | null) {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function useToolUsage(toolSlug: string): UseToolUsageResult {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isLimited = !TESTING_UNLIMITED_USAGE && RESTRICTED_TOOL_SLUGS.has(toolSlug);

  const [user, setUser] = useState<User | null>(null);
  const [usesCount, setUsesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocalUsage = useCallback(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    return parseCount(window.localStorage.getItem(getStorageKey(toolSlug)));
  }, [toolSlug]);

  const saveLocalUsage = useCallback(
    (nextCount: number) => {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(getStorageKey(toolSlug), String(nextCount));
    },
    [toolSlug],
  );

  const loadRemoteUsage = useCallback(
    async (authUser: User) => {
      if (!isLimited) {
        setUsesCount(0);
        return;
      }

      const { data, error } = await supabase
        .from("user_usage")
        .select("uses_count")
        .eq("user_id", authUser.id)
        .eq("tool_slug", toolSlug)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setUsesCount(Math.max(0, data?.uses_count ?? 0));
    },
    [isLimited, supabase, toolSlug],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setIsLoading(true);

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!active) {
          return;
        }

        setUser(authUser ?? null);

        if (!isLimited) {
          setUsesCount(0);
        } else if (authUser) {
          await loadRemoteUsage(authUser);
        } else {
          setUsesCount(loadLocalUsage());
        }
      } catch {
        if (active) {
          setUsesCount(loadLocalUsage());
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setIsLoading(true);

      void (async () => {
        try {
          if (nextUser) {
            await loadRemoteUsage(nextUser);
          } else {
            setUsesCount(loadLocalUsage());
          }
        } catch {
          setUsesCount(loadLocalUsage());
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isLimited, loadLocalUsage, loadRemoteUsage, supabase]);

  const incrementUsage = useCallback(async () => {
    if (!isLimited) {
      return;
    }

    const nextCount = usesCount + 1;

    if (!user) {
      saveLocalUsage(nextCount);
      setUsesCount(nextCount);
      return;
    }

    const { error } = await supabase.from("user_usage").upsert(
      {
        user_id: user.id,
        tool_slug: toolSlug,
        uses_count: nextCount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,tool_slug",
      },
    );

    if (error) {
      throw error;
    }

    setUsesCount(nextCount);
  }, [isLimited, saveLocalUsage, supabase, toolSlug, user, usesCount]);

  return {
    remainingUses: isLimited ? Math.max(0, FREE_LIMIT - usesCount) : TESTING_REMAINING_USES,
    incrementUsage,
    isAuthenticated: Boolean(user),
    isLoading,
    isLimited,
  };
}
