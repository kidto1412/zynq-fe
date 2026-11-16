import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-surface-container-highest text-on-surface",
    secondary: "bg-secondary/10 text-secondary border border-secondary/20",
    outline: "border border-outline-variant text-on-surface-variant",
    success: "bg-secondary-container text-on-secondary-container",
    warning: "bg-tertiary-container/20 text-tertiary border border-tertiary/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
