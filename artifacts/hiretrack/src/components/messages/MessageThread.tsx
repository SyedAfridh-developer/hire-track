import { useEffect, useRef, useState } from "react";
import { useGetMessageThread, useSendMessage, useMarkThreadRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  applicationId: number;
  open: boolean;
  onClose: () => void;
}

function timeStr(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageThread({ applicationId, open, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const qKey = [`/api/messages/${applicationId}`];

  const { data, isLoading } = useGetMessageThread(applicationId, {
    query: {
      enabled: open,
      queryKey: qKey,
      refetchInterval: open ? 10000 : false,
    },
  });

  const markRead = useMarkThreadRead();
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (open && applicationId) {
      markRead.mutate({ applicationId });
    }
  }, [open, applicationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMessage.mutate(
      { applicationId, data: { body: trimmed } },
      {
        onSuccess: () => {
          setDraft("");
          queryClient.invalidateQueries({ queryKey: qKey });
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  }

  const messages = data?.messages ?? [];
  const otherName = data?.otherPartyName ?? "…";
  const jobTitle = data?.jobTitle ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 flex flex-col h-[600px]">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span>Chat with {otherName}</span>
          </DialogTitle>
          {jobTitle && (
            <p className="text-xs text-muted-foreground mt-0.5">Re: {jobTitle}</p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className={`h-10 w-3/4 rounded-xl ${i % 2 ? "ml-auto" : ""}`} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start the conversation below.</p>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {isMe ? "You" : msg.senderName} · {timeStr(msg.createdAt as unknown as string)}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex gap-2 items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Ctrl+Enter to send)"
              className="resize-none min-h-[60px] max-h-[120px] text-sm bg-background"
              rows={2}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!draft.trim() || sendMessage.isPending}
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
