"use client";

import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase/client";
import { fetchProfile } from "@/services/auth/authService";
import { useAuthStore } from "@/stores/authStore";

export function AuthBootstrap() {
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (!supabase) {
      setAuth(null, null);
      return undefined;
    }

    let active = true;
    let hydrationId = 0;
    let hydrationTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHydrationTimer = () => {
      if (hydrationTimer) {
        clearTimeout(hydrationTimer);
        hydrationTimer = null;
      }
    };

    const hydrateProfileAfterAuthEvent = (session: Session) => {
      const currentHydrationId = hydrationId + 1;
      hydrationId = currentHydrationId;
      clearHydrationTimer();

      hydrationTimer = setTimeout(async () => {
        try {
          const profile = await fetchProfile(session.user.id);
          if (!active || hydrationId !== currentHydrationId) return;
          setAuth(profile, session.access_token);
        } catch {
          if (!active || hydrationId !== currentHydrationId) return;
          setAuth(null, null);
        }
      }, 0);
    };

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        hydrationId += 1;
        clearHydrationTimer();
        setAuth(null, null);
        return;
      }

      const currentUser = useAuthStore.getState().user;
      if (event === "TOKEN_REFRESHED" && currentUser?.id === session.user.id) {
        setAuth(currentUser, session.access_token);
        return;
      }

      hydrateProfileAfterAuthEvent(session);
    });

    return () => {
      active = false;
      hydrationId += 1;
      clearHydrationTimer();
      subscription.unsubscribe();
    };
  }, [setAuth]);

  return null;
}
