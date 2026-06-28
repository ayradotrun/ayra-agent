"use client";

import { useCallback, useState } from "react";
import { Eye, EyeOff, Lock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SecretName, SecretScope } from "@/lib/secrets/secret-store";

export interface SecretFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  configured?: boolean;
  placeholder?: string;
  /** When set, Delete calls API to remove secret from DB */
  secretScope?: SecretScope;
  secretName?: SecretName;
  onDeleted?: () => void;
}

export function SecretField({
  id,
  label,
  value,
  onChange,
  configured,
  placeholder,
  secretScope,
  secretName,
  onDeleted,
}: SecretFieldProps) {
  const [replacing, setReplacing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [fetchedValue, setFetchedValue] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState("");

  const isSavedMasked = configured && !replacing && !value;
  const canRevealSaved = isSavedMasked && !!secretScope && !!secretName;

  const displayValue = isSavedMasked
    ? revealed && fetchedValue
      ? fetchedValue
      : "••••••••••••••••"
    : value;

  const readOnly = isSavedMasked && !(revealed && fetchedValue);
  const showEye = canRevealSaved || (!isSavedMasked && (value.length > 0 || replacing));

  const handleToggleReveal = useCallback(async () => {
    if (revealed) {
      setRevealed(false);
      setFetchedValue(null);
      setRevealError("");
      return;
    }

    if (canRevealSaved && !fetchedValue) {
      setRevealLoading(true);
      setRevealError("");
      try {
        const res = await fetch(
          `/api/settings/secrets?provider=${encodeURIComponent(secretScope!)}&name=${encodeURIComponent(secretName!)}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setRevealError(err.error || "Failed to reveal secret");
          return;
        }
        const data = (await res.json()) as { value?: string };
        setFetchedValue(data.value ?? "");
        setRevealed(true);
      } finally {
        setRevealLoading(false);
      }
      return;
    }

    setRevealed(true);
  }, [revealed, canRevealSaved, fetchedValue, secretScope, secretName]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!secretScope || !secretName) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(
        `/api/settings/secrets?provider=${encodeURIComponent(secretScope)}&name=${encodeURIComponent(secretName)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.error || "Failed to delete secret");
        return;
      }
      onChange("");
      setReplacing(false);
      setRevealed(false);
      setFetchedValue(null);
      setDeleteOpen(false);
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  }, [secretScope, secretName, onChange, onDeleted]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {configured && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-500">
            <Lock className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          id={id}
          type={revealed ? "text" : "password"}
          value={displayValue}
          onChange={(e) => {
            setReplacing(true);
            setRevealed(false);
            setFetchedValue(null);
            onChange(e.target.value);
          }}
          placeholder={configured && !replacing ? undefined : placeholder}
          readOnly={readOnly}
          className={readOnly ? "text-muted-foreground" : undefined}
          autoComplete="off"
        />
        {showEye && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={revealLoading}
            onClick={() => void handleToggleReveal()}
            title={revealed ? "Hide" : "Reveal"}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {revealError && <p className="text-xs text-destructive">{revealError}</p>}

      <div className="flex flex-wrap gap-2">
        {configured && !replacing && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setReplacing(true);
                setRevealed(false);
                setFetchedValue(null);
                onChange("");
              }}
            >
              Replace secret
            </Button>
            {secretScope && secretName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deleting}
                onClick={() => {
                  setDeleteError("");
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete secret
              </Button>
            )}
          </>
        )}
        {replacing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setReplacing(false);
              setRevealed(false);
              setFetchedValue(null);
              onChange("");
            }}
          >
            Cancel replace
          </Button>
        )}
      </div>

      {configured && !replacing && !value && (
        <p className="text-xs text-muted-foreground">
          Secret is stored encrypted. Use Replace or Delete — no need to re-enter unless changing.
        </p>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${label}?`}
        description={
          <>
            The saved {label.toLowerCase()} will be permanently removed. This cannot be undone.
            {deleteError && (
              <p className="mt-2 text-destructive">{deleteError}</p>
            )}
          </>
        }
        confirmLabel="Delete secret"
        loading={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteError("");
          }
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}
