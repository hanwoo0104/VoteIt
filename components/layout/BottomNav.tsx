"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, UserRound, Vote } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "홈", icon: Home },
  { href: "/discussions", label: "토론", icon: Vote },
  { href: "/chat", label: "채팅", icon: MessageCircle },
  { href: "/profile", label: "마이", icon: UserRound }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-slate-200/70 bg-white/90 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition",
                active ? "text-vote-red" : "text-slate-400 hover:text-vote-ink"
              )}
            >
              {active ? (
                <motion.span
                  layoutId="bottom-tab"
                  className="absolute inset-1 rounded-2xl bg-vote-red/8"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              ) : null}
              <Icon className="relative h-5 w-5" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
