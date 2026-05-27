import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
        <Inbox className="h-7 w-7" />
      </div>
      <p className="mt-4 text-lg font-black text-vote-ink">{title}</p>
      {description ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p> : null}
    </div>
  );
}

export function ErrorState({
  title = "문제가 발생했습니다",
  description,
  onRetry
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-vote-red/10 bg-white p-6 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-vote-red/10 text-vote-red">
        <AlertCircle className="h-7 w-7" />
      </div>
      <p className="mt-4 text-lg font-black text-vote-ink">{title}</p>
      {description ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p> : null}
      {onRetry ? (
        <Button className="mt-5" variant="primary" onClick={onRetry}>
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}
