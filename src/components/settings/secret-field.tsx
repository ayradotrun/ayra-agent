"use client";

import { useCallback, useState } from "react";
import { Eye, EyeOff, Lock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  const masked = configured && !replacing && !value;
  const displayValue = masked ? "••••••••••••••••" : value;

  const handleDelete = useCallback(async () => {
    if (!secretScope || !secretName) return;
    if (!confirm(`Delete saved ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/settings/secrets?provider=${encodeURIComponent(secretScope)}&name=${encodeURIComponent(secretName)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete secret");
        return;
      }
      onChange("");
      setReplacing(false);
      setRevealed(false);
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  }, [secretScope, secretName, label, onChange, onDeleted]);

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
          type={revealed && !masked ? "text" : "password"}
          value={displayValue}
          onChange={(e) => {
            setReplacing(true);
            onChange(e.target.value);
          }}
          placeholder={configured && !replacing ? undefined : placeholder}
          readOnly={masked}
          className={masked ? "text-muted-foreground" : undefined}
          autoComplete="off"
        />
        {configured && !replacing && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setRevealed((v) => !v)}
            title={revealed ? "Hide" : "Reveal"}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {configured && !replacing && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setReplacing(true)}>
              Replace secret
            </Button>
            {secretScope && secretName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deleting}
                onClick={handleDelete}
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
    </div>
  );
}
