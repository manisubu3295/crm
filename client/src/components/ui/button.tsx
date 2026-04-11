import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:     "bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md",
        primary:     "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow-md",
        destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
        outline:     "border border-border bg-background text-foreground shadow-sm hover:bg-muted hover:border-slate-300",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:       "text-slate-600 hover:bg-muted hover:text-slate-900",
        link:        "text-indigo-600 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-lg px-6 text-[13px]",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = "Button";
