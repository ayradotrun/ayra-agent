import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AgentChat } from "@/components/chat/agent-chat";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading chat…
        </div>
      }
    >
      <AgentChat />
    </Suspense>
  );
}
