export type BlueprintSlotType = "time" | "enum" | "text" | "weekdays";

export interface BlueprintSlot {
  name: string;
  type: BlueprintSlotType;
  label: string;
  default?: string | number | null;
  options?: readonly string[];
  optional?: boolean;
  help?: string;
  strict?: boolean;
}

export interface AutomationBlueprint {
  key: string;
  title: string;
  description: string;
  category: string;
  scheduleTemplate: string;
  promptTemplate: string;
  slots: BlueprintSlot[];
  deliverDefault?: string;
  skills?: readonly string[];
  tags?: readonly string[];
}

export class BlueprintFillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlueprintFillError";
  }
}

export interface CronSuggestionEntry {
  key: string;
  title: string;
  description: string;
  jobSpec: {
    prompt: string;
    schedule: string;
    name: string;
    deliver: string;
  };
}
