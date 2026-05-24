import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1 text-[34px] font-black tracking-normal text-navy-900", className)}>
      <span className="leading-none">보팃</span>
      <span className="relative ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-vote-red">
        <span className="absolute h-[31px] w-[3px] rotate-[2deg] rounded-full bg-vote-red" />
        <span className="absolute h-[3px] w-[28px] rotate-[45deg] rounded-full bg-vote-red" />
      </span>
    </div>
  );
}
