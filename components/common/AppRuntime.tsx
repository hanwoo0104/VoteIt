"use client";

import { useEffect, useState } from "react";
import { AuthBootstrap } from "@/components/common/AuthBootstrap";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";

const CACHE_PREFIX = "voteit-pwa-";
const DEV_SW_RELOAD_KEY = "voteit-dev-sw-cleaned";

async function cleanupDevelopmentServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const voteItRegistrations = registrations.filter((registration) =>
    [registration.active, registration.installing, registration.waiting].some((worker) => worker?.scriptURL.endsWith("/sw.js"))
  );

  const unregisterResults = await Promise.all(voteItRegistrations.map((registration) => registration.unregister().catch(() => false)));

  if ("caches" in window) {
    window.caches
      .keys()
      .then((cacheKeys) =>
        Promise.all(cacheKeys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => window.caches.delete(key).catch(() => false)))
      )
      .catch(() => undefined);
  }

  if (unregisterResults.some(Boolean) && navigator.serviceWorker.controller && window.sessionStorage.getItem(DEV_SW_RELOAD_KEY) !== "true") {
    window.sessionStorage.setItem(DEV_SW_RELOAD_KEY, "true");
    window.location.reload();
  }
}

export function AppRuntime({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(process.env.NODE_ENV === "production");

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    let active = true;
    const readyTimer = window.setTimeout(() => {
      if (active) setReady(true);
    }, 900);

    cleanupDevelopmentServiceWorker()
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(readyTimer);
        if (active) setReady(true);
      });

    return () => {
      active = false;
      window.clearTimeout(readyTimer);
    };
  }, []);

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] items-center justify-center bg-white">
        <div className="h-8 w-8 animate-pulse rounded-full bg-vote-red/20" />
      </main>
    );
  }

  return (
    <>
      <AuthBootstrap />
      {children}
      <PWAInstallPrompt />
    </>
  );
}
