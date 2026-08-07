"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}

export function Dialog({ open, onClose, title, children, className, hideClose }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl",
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
          {!hideClose && onClose && (
            <button
              onClick={onClose}
              className="text-muted transition-colors hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
