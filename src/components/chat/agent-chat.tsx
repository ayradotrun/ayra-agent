"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  ImagePlus,
  Lightbulb,
  Loader2,
  History,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CHAT_COMMAND_HINTS, AGENT_META_COMMANDS_UI, MODEL_COMMANDS_UI, SKILL_COMMANDS_UI } from "@/lib/telegram/commands";
import { ChatRecentsDrawer } from "@/components/chat/chat-sidebar";
import { chatSessionHref, notifyChatSessionsChanged } from "@/lib/chat/recents";

interface AgentOption {
  id: string;
  name: string;
  status: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  metadata?: { imageUrls?: string[]; reasoning?: string } | null;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  chatModel?: string | null;
  deepThinking?: boolean;
  agent: { id: string; name: string };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const images = message.metadata?.imageUrls ?? [];
  const reasoning = message.metadata?.reasoning;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "surface-card rounded-bl-md text-foreground"
        )}
      >
        {!isUser && reasoning && (
          <details className="mb-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
              Deep thinking
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{reasoning}</p>
          </details>
        )}
        {message.content && message.content !== "(image)" && message.content}
        <p
          className={cn(
            "mt-1.5 text-[10px] opacity-60",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatTime(message.createdAt)}
        </p>
        {images.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", message.content && message.content !== "(image)" ? "mt-3" : "")}>
            {images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={isUser ? "Uploaded" : "Generated"}
                  className="max-h-48 rounded-lg border border-border/60"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [hasAnyAgent, setHasAnyAgent] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionParam);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentName, setAgentName] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepThinking, setDeepThinking] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadSession = useCallback(
    async (sessionId: string) => {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (!res.ok) {
        router.replace("/dashboard/chat");
        return;
      }
      const data = await res.json();
      setActiveSessionId(sessionId);
      setMessages(data.messages ?? []);
      setAgentName(data.agent?.name ?? "");
      setSelectedAgentId(data.agent?.id ?? "");
      setDeepThinking(data.deepThinking ?? false);
      setPendingImages([]);
      setTimeout(scrollToBottom, 50);
    },
    [scrollToBottom, router]
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [agentsRes] = await Promise.all([fetch("/api/agents")]);
      if (agentsRes.ok) {
        const list = (await agentsRes.json()) as AgentOption[];
        setHasAnyAgent(list.length > 0);
        setAgents(list.filter((a) => a.status === "ACTIVE"));
        if (list.length > 0) {
          setSelectedAgentId(list.find((a) => a.status === "ACTIVE")?.id ?? "");
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (sessionParam) {
      loadSession(sessionParam);
    } else {
      setActiveSessionId(null);
      setMessages([]);
      setAgentName("");
      setDeepThinking(false);
      setPendingImages([]);
    }
  }, [sessionParam, loadSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  async function updateSessionPrefs(patch: { deepThinking?: boolean }) {
    if (!activeSessionId) return;
    await fetch(`/api/chat/sessions/${activeSessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function handleDeepThinkingChange(enabled: boolean) {
    setDeepThinking(enabled);
    await updateSessionPrefs({ deepThinking: enabled });
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (pendingImages.length + files.length > 4) {
      setError("Maximum 4 images per message");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/chat/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPendingImages((prev) => [...prev, ...(data.urls as string[])].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePendingImage(url: string) {
    setPendingImages((prev) => prev.filter((u) => u !== url));
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || sending) return;

    setError(null);
    setSending(true);
    const imagesToSend = [...pendingImages];
    setInput("");
    setPendingImages([]);

    let sessionId = activeSessionId;
    if (!sessionId) {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Could not start chat");
        setSending(false);
        setInput(text);
        setPendingImages(imagesToSend);
        return;
      }
      const session = (await res.json()) as ChatSession;
      sessionId = session.id;
      setActiveSessionId(sessionId);
      setAgentName(session.agent?.name ?? "");
      router.replace(chatSessionHref(sessionId));
      notifyChatSessionsChanged();
    }

    const optimisticUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text || "(image)",
      metadata: imagesToSend.length > 0 ? { imageUrls: imagesToSend } : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: text,
        imageUrls: imagesToSend.length > 0 ? imagesToSend : undefined,
        deepThinking,
      }),
    });

    setSending(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Message failed");
      setPendingImages(imagesToSend);
      await loadSession(sessionId!);
      return;
    }

    const data = await res.json();
    setMessages((prev) => {
      const withoutTmp = prev.filter((m) => m.id !== optimisticUser.id);
      return [...withoutTmp, data.userMessage, data.assistantMessage];
    });
    if (data.agent?.id) {
      setSelectedAgentId(data.agent.id);
      setAgentName(data.agent.name ?? "");
    }
    notifyChatSessionsChanged();
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading chat…
      </div>
    );
  }

  if (!hasAnyAgent) {
    return (
      <div className="surface-card flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Bot className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Create an agent first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat requires at least one agent. Create one in Agents, then come back here.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/agents/new">Create agent</Link>
        </Button>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="surface-card flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Bot className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No active agent</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Resume a paused agent or create a new one before chatting.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/agents">Go to agents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <ChatRecentsDrawer open={recentsOpen} onClose={() => setRecentsOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden"
            onClick={() => setRecentsOpen(true)}
            aria-label="Open chat history"
          >
            <History className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{agentName || "AYRA Chat"}</p>
          </div>
          {!activeSessionId && (
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="h-8 w-[120px] sm:w-[140px] text-xs">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </header>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-4 py-6",
            messages.length === 0 && !sending && "flex flex-col justify-end md:block md:justify-start"
          )}
        >
          {messages.length === 0 && !sending && (
            <div className="mx-auto w-full max-w-lg pb-2 text-center md:pb-0 md:pt-[10vh]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <Bot className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-lg font-medium">Chat with your agent</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Slash commands — type /help or browse skills below
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {CHAT_COMMAND_HINTS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    onClick={() => setInput(hint)}
                  >
                    {hint}
                  </button>
                ))}
              </div>
              <div className="mx-auto mt-6 grid max-w-md gap-3 text-left">
                {[
                  { title: "Skill commands", items: SKILL_COMMANDS_UI },
                  { title: "Agent commands", items: AGENT_META_COMMANDS_UI.map((c) => ({ cmd: c.cmd, desc: c.desc })) },
                  { title: "Model commands", items: MODEL_COMMANDS_UI.map((c) => ({ cmd: c.cmd, desc: c.desc })) },
                ].map((section) => (
                  <details key={section.title} className="rounded-lg border border-border/60">
                    <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      {section.title}
                    </summary>
                    <ul className="max-h-48 space-y-1.5 overflow-y-auto border-t border-border/40 p-3 text-xs text-muted-foreground">
                      {section.items.map((c) => (
                        <li key={c.cmd}>
                          <button
                            type="button"
                            className="flex w-full items-start gap-2 text-left hover:text-foreground"
                            onClick={() =>
                              setInput(
                                c.cmd.includes("[") ? `${c.cmd.split(" [")[0]} ` : c.cmd
                              )
                            }
                          >
                            <span className="shrink-0 font-mono text-[11px] text-foreground/90">
                              {c.cmd}
                            </span>
                            <span>{c.desc}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="surface-card flex items-center gap-2 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {deepThinking ? "Deep thinking…" : "Agent is thinking…"}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-background/95 p-3 backdrop-blur-sm sm:p-4 md:bg-transparent md:backdrop-blur-none">
          {error && <p className="mb-2 text-center text-xs text-destructive">{error}</p>}
          <div className="mx-auto w-full max-w-3xl">
            {pendingImages.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 px-1">
                {pendingImages.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Pending upload"
                      className="h-14 w-14 rounded-lg border border-border/60 object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 rounded-full border border-border/60 bg-background p-0.5 shadow"
                      onClick={() => removePendingImage(url)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-sm transition-colors focus-within:border-white/[0.14] focus-within:bg-white/[0.04]">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                disabled={sending}
                className="min-h-[48px] max-h-40 resize-none border-0 bg-transparent px-4 pb-1 pt-3.5 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
              />

              <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-0.5">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => handleDeepThinkingChange(!deepThinking)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                      deepThinking
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                    )}
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span className="hidden min-[400px]:inline">
                      Deep thinking {deepThinking ? "on" : "off"}
                    </span>
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled={sending || uploading || pendingImages.length >= 4}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white/[0.1] text-foreground hover:bg-white/[0.16]"
                    onClick={sendMessage}
                    disabled={
                      sending || uploading || (!input.trim() && pendingImages.length === 0)
                    }
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
