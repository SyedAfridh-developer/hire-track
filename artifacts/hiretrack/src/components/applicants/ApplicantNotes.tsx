import { useState, useRef } from "react";
import {
  useGetApplicationNotes,
  useCreateApplicationNote,
  useDeleteApplicationNote,
  getGetApplicationNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { StickyNote, Plus, Trash2, ChevronDown, ChevronUp, Lock } from "lucide-react";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  applicationId: number;
}

export function ApplicantNotes({ applicationId }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getGetApplicationNotesQueryKey(applicationId);

  const { data: notes, isLoading } = useGetApplicationNotes(applicationId, {
    query: { queryKey, enabled: open },
  });

  const createNote = useCreateApplicationNote();
  const deleteNote = useDeleteApplicationNote();

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) setTimeout(() => textareaRef.current?.focus(), 150);
  }

  function handleAdd() {
    if (!draft.trim()) return;
    createNote.mutate(
      { applicationId, data: { body: draft.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
          setDraft("");
          setIsAdding(false);
          toast({ title: "Note saved" });
        },
        onError: () => toast({ title: "Failed to save note", variant: "destructive" }),
      }
    );
  }

  function handleDelete(noteId: number) {
    deleteNote.mutate(
      { applicationId, noteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
          toast({ title: "Note deleted" });
        },
        onError: () => toast({ title: "Failed to delete note", variant: "destructive" }),
      }
    );
  }

  const count = notes?.length ?? 0;

  return (
    <div className="mt-3 border-t pt-3">
      {/* Toggle trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full"
      >
        <StickyNote className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
        <span className="font-medium">
          Private Notes{count > 0 ? ` (${count})` : ""}
        </span>
        <Lock className="h-3 w-3 opacity-50" />
        <span className="flex-1" />
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Existing notes */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group flex gap-2.5 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.body}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">{relativeTime(note.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    disabled={deleteNote.isPending}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                    title="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : !isAdding ? (
            <p className="text-xs text-muted-foreground italic">No notes yet. Add one below.</p>
          ) : null}

          {/* Add note form */}
          {isAdding ? (
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write an internal note about this candidate…"
                className="text-sm min-h-[80px] resize-none bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 focus-visible:ring-amber-400/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
                  if (e.key === "Escape") { setIsAdding(false); setDraft(""); }
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAdd}
                  disabled={!draft.trim() || createNote.isPending}
                >
                  Save note
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setIsAdding(false); setDraft(""); }}
                >
                  Cancel
                </Button>
                <span className="text-[10px] text-muted-foreground ml-auto">⌘↵ to save · Esc to cancel</span>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-dashed"
              onClick={() => { setIsAdding(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add note
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
