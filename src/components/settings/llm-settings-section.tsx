"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LlmProviderPicker } from "@/components/settings/llm-provider-picker";
import { SecretField } from "@/components/settings/secret-field";
import { ModelField } from "@/components/settings/model-field";
import { FallbackModelsList } from "@/components/settings/fallback-models-list";
import { getLlmProviderPreset } from "@/lib/llm-providers";
import type { ProviderModelOption } from "@/lib/llm/provider-models";

interface LlmSettingsSectionProps {
  llmProviderId: string;
  llmBaseUrl: string;
  defaultModel: string;
  defaultImageModel: string;
  fallbackModels: string[];
  fallbackImageModels: string[];
  hasLlmApiKey: boolean;
  llmApiKeyDraft: string;
  onProviderChange: (providerId: string, baseUrl: string) => void;
  onDefaultModelChange: (model: string) => void;
  onDefaultImageModelChange: (model: string) => void;
  onFallbackModelsChange: (models: string[]) => void;
  onFallbackImageModelsChange: (models: string[]) => void;
  onLlmApiKeyChange: (key: string) => void;
  onSecretDeleted: () => void;
}

export function LlmSettingsSection({
  llmProviderId,
  llmBaseUrl,
  defaultModel,
  defaultImageModel,
  fallbackModels,
  fallbackImageModels,
  hasLlmApiKey,
  llmApiKeyDraft,
  onProviderChange,
  onDefaultModelChange,
  onDefaultImageModelChange,
  onFallbackModelsChange,
  onFallbackImageModelsChange,
  onLlmApiKeyChange,
  onSecretDeleted,
}: LlmSettingsSectionProps) {
  const [customUrlDraft, setCustomUrlDraft] = useState("");
  const [chatModels, setChatModels] = useState<ProviderModelOption[]>([]);
  const [imageModels, setImageModels] = useState<ProviderModelOption[]>([]);
  const [modelsStatus, setModelsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [modelsError, setModelsError] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const preset = getLlmProviderPreset(llmProviderId);
  const baseUrlRef = useRef(llmBaseUrl);
  baseUrlRef.current = llmBaseUrl;

  const loadModels = useCallback(async () => {
    setModelsStatus("loading");
    setModelsError("");
    try {
      const params = new URLSearchParams({ provider: llmProviderId });
      const base = baseUrlRef.current.trim();
      if (llmProviderId === "custom" && base) {
        params.set("baseUrl", base);
      }
      const res = await fetch(`/api/settings/models?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load models");
      setChatModels(data.chatModels ?? []);
      setImageModels(data.imageModels ?? []);
      setModelsStatus("ok");
    } catch (e) {
      setModelsStatus("error");
      setModelsError(e instanceof Error ? e.message : "Failed to load models");
    }
  }, [llmProviderId]);

  useEffect(() => {
    if (llmProviderId === "custom") {
      setCustomUrlDraft(llmBaseUrl || "");
    }
  }, [llmProviderId, llmBaseUrl]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const handleProviderChange = useCallback(
    (id: string) => {
      const baseUrl =
        id === "custom" ? customUrlDraft || llmBaseUrl || "" : getLlmProviderPreset(id).baseUrl;
      if (id === "custom") {
        setCustomUrlDraft(baseUrl);
      }
      onProviderChange(id, baseUrl);
    },
    [customUrlDraft, llmBaseUrl, onProviderChange]
  );

  async function testConnection() {
    setTestStatus("loading");
    setTestMessage("");
    try {
      const res = await fetch("/api/settings/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: llmProviderId,
          baseUrl: llmBaseUrl,
          apiKey: llmApiKeyDraft || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setTestStatus("ok");
      setTestMessage(data.message || "Connection successful");
    } catch (e) {
      setTestStatus("error");
      setTestMessage(e instanceof Error ? e.message : "Connection failed");
    }
  }

  return (
    <div className="space-y-4">
      <LlmProviderPicker providerId={llmProviderId} onProviderChange={handleProviderChange} />

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          Active: <strong className="text-foreground">{preset.name}</strong>
        </span>
        <span className="truncate text-muted-foreground">
          URL: <code className="text-[11px] text-foreground/80">{llmBaseUrl || preset.baseUrl || "—"}</code>
        </span>
        <span className="text-muted-foreground">
          Chat: <strong className="text-foreground">{chatModels.length}</strong>
        </span>
        <span className="text-muted-foreground">
          Image: <strong className="text-foreground">{imageModels.length}</strong>
        </span>
        {modelsStatus === "loading" && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </span>
        )}
        {modelsStatus === "ok" && (
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle2 className="h-3 w-3" /> Loaded
          </span>
        )}
        {modelsStatus === "error" && (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        )}
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1" onClick={loadModels}>
          <RefreshCw className="h-3 w-3" />
          Refresh models
        </Button>
      </div>
      {modelsError && <p className="text-xs text-red-400">{modelsError}</p>}

      {llmProviderId === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="llm-base-url">Custom base URL</Label>
          <Input
            id="llm-base-url"
            value={customUrlDraft || llmBaseUrl}
            onChange={(e) => {
              const v = e.target.value;
              setCustomUrlDraft(v);
              onProviderChange("custom", v);
            }}
            placeholder="https://your-host/v1"
            className="font-mono text-xs"
          />
        </div>
      )}

      <SecretField
        id="llm-api-key"
        label="API Key"
        value={llmApiKeyDraft}
        onChange={onLlmApiKeyChange}
        configured={hasLlmApiKey}
        placeholder={preset.keyHint}
        secretScope="llm"
        secretName="api_key"
        onDeleted={onSecretDeleted}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={testConnection} disabled={testStatus === "loading"}>
          {testStatus === "loading" ? "Testing…" : "Test connection"}
        </Button>
        {testStatus === "ok" && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" /> {testMessage}
          </span>
        )}
        {testStatus === "error" && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <XCircle className="h-3.5 w-3.5" /> {testMessage}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/5 p-3">
        <ModelField
          label="Chat model"
          value={defaultModel}
          onChange={onDefaultModelChange}
          models={chatModels}
        />
        <FallbackModelsList
          label="Fallback chat models"
          description="Backup chat models if primary fails. Search in the field or type a model ID, then Add."
          items={fallbackModels}
          onChange={onFallbackModelsChange}
          primaryModel={defaultModel}
          catalogModels={chatModels}
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/5 p-3">
        <ModelField
          label="Image model"
          value={defaultImageModel}
          onChange={onDefaultImageModelChange}
          models={imageModels}
          emptyHint="No image model selected"
        />
        <FallbackModelsList
          label="Fallback image models"
          description="Backup image models. Search in the field or type a model ID, then Add."
          items={fallbackImageModels}
          onChange={onFallbackImageModelsChange}
          primaryModel={defaultImageModel}
          catalogModels={imageModels}
        />
      </div>
    </div>
  );
}
