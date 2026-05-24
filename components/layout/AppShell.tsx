"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  className,
  showHeader = true,
  showBottomNav = true,
  wide = false
}: {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={cn("mx-auto min-h-dvh bg-white/55", wide ? "max-w-6xl" : "max-w-[430px]")}>
      {showHeader ? <Header /> : null}
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className={cn("safe-bottom px-5", className)}
      >
        {children}
      </motion.main>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
