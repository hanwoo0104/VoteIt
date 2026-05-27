"use client";

import { OnboardingScreen } from "@/features/auth/OnboardingScreen";
import { useAuthStore } from "@/stores/authStore";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);

  if (!initialized || loading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] items-center justify-center bg-white">
        <div className="h-8 w-8 animate-pulse rounded-full bg-vote-red/20" />
      </main>
    );
  }

  if (!user) {
    return <OnboardingScreen />;
  }

  return <>{children}</>;
}
