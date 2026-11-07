import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 - 100
  indicatorColor?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, indicatorColor = "bg-kpu-maroon", ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value || 0));

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full transition-all duration-500 ease-out", indicatorColor)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };

