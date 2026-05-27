"use client";

import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

export function Header({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore((state) => state.user);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-5 pb-3 pt-[calc(22px+env(safe-area-inset-top))]"
    >
      <Link href="/" aria-label="VoteIt 홈">
        <Logo className={compact ? "w-[82px]" : undefined} />
      </Link>
      <div className="flex items-center gap-2">
        {user?.role === "admin" ? (
          <Link href="/admin" aria-label="관리자">
            <Button size="icon" variant="soft">
              <ShieldCheck className="h-5 w-5 text-vote-red" />
            </Button>
          </Link>
        ) : null}
        <button
          aria-label="메뉴"
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-vote-ink transition active:scale-95"
        >
          <Menu className="h-7 w-7 stroke-[3]" />
        </button>
      </div>
    </motion.header>
  );
}
