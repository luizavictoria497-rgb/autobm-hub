import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-medium transition-[color,background-color,border-color,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90",
        secondary: "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]",
        outline: "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]",
        ghost: "text-[var(--foreground)] hover:bg-[var(--surface)]",
        destructive: "bg-red-600 text-white hover:bg-red-500",
      },
      size: { default: "px-4", sm: "min-h-11 px-3", lg: "min-h-12 px-6 text-base", icon: "min-h-11 w-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = "Button";