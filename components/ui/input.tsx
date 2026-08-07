import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
