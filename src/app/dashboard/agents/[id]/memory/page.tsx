"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

export default function AgentMemoryPage() {
  const params = useParams();
  const id = params.id as string;
  const [memories, setMemories] = useState<Array<{ id: string; content: string; tags: string[]; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((agent) => setMemories(agent.memories || []))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/agents/${id}`} className="inline-flex items-center text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to agent
      </Link>
      <PageHeader
        eyebrow="Memory"
        title="Stored memories"
        description="Long-term notes saved by the agent during runs."
      />
      {loading ? (
        <p className="text-[13px] text-muted-foreground">Loading...</p>
      ) : memories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No memories yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground/60">
              Memories appear when the agent uses the Memory Storage skill.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {memories.map((mem) => (
            <Card key={mem.id}>
              <CardContent className="p-4">
                <p className="text-[13px] leading-relaxed">{mem.content}</p>
                <div className="mt-3 flex items-center gap-2">
                  {mem.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                  <span className="ml-auto text-[11px] text-muted-foreground">{formatRelativeTime(mem.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
