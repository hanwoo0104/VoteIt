import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[104px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-vote-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-vote-blue focus:ring-4 focus:ring-vote-blue/10",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
