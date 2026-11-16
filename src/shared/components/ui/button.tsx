import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-headline font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-xl";
    
    const variants = {
      primary: "bg-primary text-on-primary hover:bg-primary-container shadow-[0_0_16px_rgba(76,215,246,0.25)]",
      secondary: "bg-secondary-container text-on-secondary-container hover:bg-secondary shadow-[0_0_16px_rgba(0,165,114,0.3)]",
      outline: "border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface",
      ghost: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
      danger: "bg-error-container/40 text-error hover:bg-error-container",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-11 px-4 text-sm",
      lg: "h-12 px-6 text-base",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
