"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  destructive = true,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={loading ? undefined : onClose}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className={cn(
          "relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/[0.1]",
          "bg-[hsl(220,18%,8%)] shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
            destructive ? "from-red-500/[0.08]" : "from-primary/[0.08]"
          )}
        />
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative px-6 pb-6 pt-8 text-center">
          <div
            className={cn(
              "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border",
              destructive
                ? "border-red-500/20 bg-red-500/10"
                : "border-primary/20 bg-primary/10"
            )}
          >
            <AlertTriangle
              className={cn("h-7 w-7", destructive ? "text-red-400" : "text-primary")}
            />
          </div>
          <h3 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <div
            id="confirm-dialog-desc"
            className="mt-2 text-sm leading-relaxed text-muted-foreground"
          >
            {description}
          </div>
          <div className="mt-6 flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              onClick={onClose}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              className="h-10 flex-1"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Please wait…" : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
