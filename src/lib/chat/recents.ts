export const CHAT_SESSIONS_CHANGED = "ayra:chat-sessions-changed";

export function notifyChatSessionsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHAT_SESSIONS_CHANGED));
  }
}

export function chatSessionHref(sessionId?: string | null) {
  return sessionId ? `/dashboard/chat?session=${sessionId}` : "/dashboard/chat";
}

export interface ChatSessionSummary {
  id: string;
  title: string | null;
  pinned?: boolean;
  updatedAt: string;
  agent: { id: string; name: string };
}
