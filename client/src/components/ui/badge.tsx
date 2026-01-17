import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Badge = ({ className, ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border border-ink/15 bg-white/70 px-2 py-0.5 text-xs font-semibold text-ink",
      className
    )}
    {...props}
  />
);
