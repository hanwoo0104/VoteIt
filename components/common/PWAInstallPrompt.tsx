"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-[430px] px-5">
      <div className="glass-surface flex items-center gap-3 rounded-3xl p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-900 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-vote-ink">VoteIt 앱으로 설치</p>
          <p className="truncate text-xs text-slate-500">홈 화면에서 네이티브 앱처럼 열 수 있어요.</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            await promptEvent.prompt();
            setDismissed(true);
          }}
        >
          설치
        </Button>
        <button
          aria-label="설치 안내 닫기"
          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
