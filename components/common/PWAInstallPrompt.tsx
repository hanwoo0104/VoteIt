"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "voteit-pwa-install-guide-dismissed";

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
    }

    setIos(isIos());

    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "true";
    if (!isStandalonePwa() && !dismissed) {
      window.setTimeout(() => setOpen(true), 700);
    }

    const installHandler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      if (!isStandalonePwa() && window.localStorage.getItem(DISMISS_KEY) !== "true") {
        setOpen(true);
      }
    };

    const installedHandler = () => {
      window.localStorage.setItem(DISMISS_KEY, "true");
      setOpen(false);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const close = () => {
    window.localStorage.setItem(DISMISS_KEY, "true");
    setOpen(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    close();
  };

  return (
    <Modal open={open} title="보팃을 앱처럼 설치하기" onClose={close}>
      <div className="space-y-4">
        <div className="flex gap-3 rounded-3xl bg-slate-50 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-white">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-vote-ink">홈 화면에서 바로 열 수 있어요</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              설치하면 주소창 없이 네이티브 앱처럼 보팃을 사용할 수 있습니다.
            </p>
          </div>
        </div>

        {promptEvent ? (
          <Button variant="primary" size="lg" className="w-full" onClick={install}>
            <Download className="h-5 w-5" />
            지금 설치하기
          </Button>
        ) : (
          <InstallManual ios={ios} />
        )}

        <Button variant="ghost" size="sm" className="w-full text-slate-400" onClick={close}>
          나중에 할게요
        </Button>
      </div>
    </Modal>
  );
}

function InstallManual({ ios }: { ios: boolean }) {
  const steps = ios
    ? ["Safari 하단의 공유 버튼을 누르세요.", "'홈 화면에 추가'를 선택하세요.", "오른쪽 위 '추가'를 누르면 설치됩니다."]
    : ["브라우저 메뉴를 여세요.", "'앱 설치' 또는 '홈 화면에 추가'를 선택하세요.", "안내에 따라 보팃을 설치하세요."];

  return (
    <div className="rounded-3xl border border-slate-100 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-vote-ink">
        <Share2 className="h-4 w-4 text-vote-red" />
        설치 방법
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2 text-sm leading-relaxed text-slate-600">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
