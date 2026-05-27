import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-slate-200/80", className)} />;
}

export function ShimmerLoader({ text = "불러오는 중..." }: { text?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <p className="shimmer-line animate-shimmer text-sm font-black">{text}</p>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-8/12" />
        <Skeleton className="h-3 w-10/12" />
      </div>
    </div>
  );
}
