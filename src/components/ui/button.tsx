import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpu-maroon focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-kpu-maroon text-white hover:bg-kpu-darkMaroon shadow-sm hover:shadow",
        maroon:
          "bg-kpu-maroon text-white hover:bg-kpu-darkMaroon shadow-sm",
        gold:
          "bg-kpu-gold text-kpu-darkMaroon font-bold hover:bg-amber-400 shadow-sm",
        orange:
          "bg-kpu-orange text-white hover:bg-kpu-darkOrange shadow-sm",
        outline:
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-900 shadow-xs",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost:
          "hover:bg-slate-100 text-slate-700 hover:text-slate-900",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

