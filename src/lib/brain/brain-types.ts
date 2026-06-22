export type BrainTaskType = "TWEET" | "CALENDAR" | "REMINDER" | "CUSTOM";
export type BrainTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface BrainTaskRecord {
  id: string;
  userId: string;
  agentId: string;
  type: BrainTaskType;
  status: BrainTaskStatus;
  title: string;
  payload: Record<string, unknown>;
  scheduledAt: Date;
  completedAt: Date | null;
  result: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BrainTaskFilter = {
  agentId?: string;
  status?: BrainTaskStatus | BrainTaskStatus[];
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  limit?: number;
  order?: "asc" | "desc";
};

export type BrainTaskCountFilter = {
  agentId?: string;
  status?: BrainTaskStatus;
  scheduledBefore?: Date;
};

export type BrainTaskUpdate = Partial<{
  status: BrainTaskStatus;
  completedAt: Date | null;
  result: string | null;
  error: string | null;
}>;

export type CreateBrainTaskInput = {
  userId: string;
  agentId: string;
  type: BrainTaskType;
  title: string;
  payload?: Record<string, unknown>;
  scheduledAt: Date;
};
