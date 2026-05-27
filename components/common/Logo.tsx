import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/voteit-logo.png"
      alt="보팃"
      width={107}
      height={41}
      priority
      draggable={false}
      className={cn("h-auto w-[98px] select-none", className)}
    />
  );
}
