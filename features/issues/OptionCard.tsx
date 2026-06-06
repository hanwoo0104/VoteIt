"use client";

import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import type { IssueOption } from "@/types";
import { cn } from "@/lib/utils";

export function OptionCard({
  option,
  selected,
  disabled,
  actionLabel = "탭해서 의견 선택",
  onSelect
}: {
  option: IssueOption;
  selected: boolean;
  disabled?: boolean;
  actionLabel?: string;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "light-sweep relative min-h-[92px] w-full overflow-hidden rounded-3xl p-4 text-left text-white shadow-soft transition",
        selected && "shadow-glow ring-2 ring-white",
        disabled && "opacity-70"
      )}
      style={{ background: option.gradient }}
    >
      <div className="relative z-10 flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black">{option.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/88">{option.shortText}</p>
          </div>
          {selected ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : null}
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-white/80">
          <span>현재 {option.percent}% 선택</span>
          <span>{actionLabel}</span>
        </div>
      </div>
    </motion.button>
  );
}
