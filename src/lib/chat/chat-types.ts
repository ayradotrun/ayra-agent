export interface ChatSessionRecord {
  id: string;
  userId: string;
  agentId: string;
  title: string | null;
  pinned: boolean;
  chatModel: string | null;
  deepThinking: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  runId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export type ChatSessionPatch = Partial<{
  title: string;
  pinned: boolean;
  chatModel: string | null;
  deepThinking: boolean;
  agentId: string;
  updatedAt: Date;
}>;

export type CreateChatMessageInput = {
  role: string;
  content: string;
  runId?: string | null;
  metadata?: Record<string, unknown> | null;
};
