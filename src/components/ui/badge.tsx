import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white",
        secondary:
          "border-transparent bg-slate-100 text-slate-800",
        maroon:
          "border-transparent bg-kpu-maroon text-white",
        gold:
          "border-amber-300 bg-amber-50 text-amber-900 font-bold",
        orange:
          "border-orange-200 bg-orange-50 text-kpu-darkOrange",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700",
        outline: "text-slate-700 border-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

