"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, indicatorClassName, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "bg-muted relative h-2 w-full overflow-hidden rounded-full",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "bg-primary h-full transition-all duration-300 ease-out",
            indicatorClassName,
          )}
          // A nonzero value never rounds down to an invisible sliver.
          style={{ width: `${percentage}%`, minWidth: percentage > 0 ? 4 : 0 }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
