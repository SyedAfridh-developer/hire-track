import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useUpdateApplicationStatus, useListJobs, getListJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, CalendarDays, Briefcase, ExternalLink, GripVertical, LayoutGrid } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "applied" | "shortlisted" | "hired" | "rejected";

interface PipelineCard {
  id: number;
  status: Status;
  candidateId: number;
  jobId: number;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  job: { id: number; title: string; location: string; skills: string[] } | null;
  candidate: { userId: number; skills: string[]; user: { id: number; name: string; email: string } } | null;
}

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: { id: Status; label: string; accent: string; bg: string; border: string; dot: string }[] = [
  { id: "applied",     label: "Applied",     accent: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/20",    border: "border-blue-200 dark:border-blue-800/40",    dot: "bg-blue-400" },
  { id: "shortlisted", label: "Shortlisted", accent: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/20",  border: "border-amber-200 dark:border-amber-800/40",  dot: "bg-amber-400" },
  { id: "hired",       label: "Hired",       accent: "#22c55e", bg: "bg-green-50 dark:bg-green-950/20",  border: "border-green-200 dark:border-green-800/40",  dot: "bg-green-400" },
  { id: "rejected",    label: "Rejected",    accent: "#ef4444", bg: "bg-red-50 dark:bg-red-950/20",      border: "border-red-200 dark:border-red-800/40",      dot: "bg-red-400" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function matchScore(cardSkills: string[], jobSkills: string[]) {
  if (!jobSkills.length || !cardSkills.length) return null;
  const matched = jobSkills.filter((js) =>
    cardSkills.some((cs) => cs.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(cs.toLowerCase()))
  );
  return Math.round((matched.length / jobSkills.length) * 100);
}

function MatchBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : score >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}>{score}%</span>;
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ card, index }: { card: PipelineCard; index: number }) {
  const name = card.candidate?.user?.name ?? "Unknown";
  const jobTitle = card.job?.title ?? "Unknown job";
  const jobId = card.job?.id;
  const candidateSkills = card.candidate?.skills ?? [];
  const jobSkills = card.job?.skills ?? [];
  const score = matchScore(candidateSkills, jobSkills);

  return (
    <Draggable draggableId={String(card.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group bg-card rounded-lg border shadow-sm p-3 mb-2 select-none transition-shadow ${snapshot.isDragging ? "shadow-lg rotate-1 ring-2 ring-primary/40" : "hover:shadow-md"}`}
        >
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <div
              {...provided.dragHandleProps}
              className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {initials(name)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="font-semibold text-sm text-foreground truncate">{name}</span>
                <MatchBadge score={score} />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Briefcase className="h-3 w-3 shrink-0" />
                <span className="truncate">{jobTitle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {relativeDate(card.createdAt)}
                </span>
                {jobId && (
                  <Link href={`/recruiter/jobs/${jobId}/applicants`}>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  cards,
  isOver,
}: {
  col: typeof COLUMNS[number];
  cards: PipelineCard[];
  isOver: boolean;
}) {
  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-t border-x ${col.border} ${col.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
          <span className="text-sm font-semibold text-foreground">{col.label}</span>
        </div>
        <span className="text-xs font-medium bg-background/80 text-muted-foreground px-2 py-0.5 rounded-full border">
          {cards.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[calc(100vh-280px)] p-2 rounded-b-xl border-b border-x transition-colors ${col.border} ${snapshot.isDraggingOver ? col.bg + " ring-2 ring-inset ring-primary/20" : "bg-muted/20 dark:bg-muted/10"}`}
          >
            {cards.map((card, idx) => (
              <KanbanCard key={card.id} card={card} index={idx} />
            ))}
            {provided.placeholder}
            {cards.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-24 text-xs text-muted-foreground/50 gap-1">
                <Users className="h-5 w-5" />
                <span>Drop here</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateApplicationStatus();

  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState<string>("all");

  const { data: jobsData } = useListJobs({ limit: 100 }, {
    query: { queryKey: getListJobsQueryKey({ limit: 100 }) },
  });

  // Fetch pipeline data
  const fetchPipeline = useCallback(async (jf: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = jf !== "all" ? `/api/recruiter/pipeline?jobId=${jf}` : "/api/recruiter/pipeline";
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setCards(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPipeline(jobFilter); }, [jobFilter, fetchPipeline]);

  // Drag end handler
  function handleDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;

    const cardId = parseInt(draggableId);
    const newStatus = destination.droppableId as Status;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newStatus) return;

    // Optimistic update
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status: newStatus } : c));

    updateStatus.mutate(
      { applicationId: cardId, data: { status: newStatus } },
      {
        onError: () => {
          // Roll back
          setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status: card.status } : c));
          toast({ title: "Failed to update status", variant: "destructive" });
        },
        onSuccess: () => {
          toast({ title: `Moved to ${COLUMNS.find((c) => c.id === newStatus)?.label}` });
        },
      }
    );
  }

  // Group cards by status
  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = cards.filter((c) => c.status === col.id);
    return acc;
  }, {} as Record<Status, PipelineCard[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline Kanban</h1>
            <p className="text-sm text-muted-foreground">Drag cards between columns to update status</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Job filter */}
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobsData?.jobs?.map((j) => (
                <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Total count */}
          <div className="text-sm text-muted-foreground shrink-0">
            <span className="font-semibold text-foreground">{cards.length}</span> applicants
          </div>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="w-72 shrink-0 space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6">
            {COLUMNS.map((col) => (
              <KanbanColumn key={col.id} col={col} cards={byStatus[col.id]} isOver={false} />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Empty state */}
      {!loading && cards.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-25" />
          <h3 className="text-base font-medium text-foreground mb-1">No applications yet</h3>
          <p className="text-sm mb-4">
            {jobFilter !== "all" ? "No applications for this job." : "Post a job and share it to start receiving applications."}
          </p>
          <Button variant="outline" asChild>
            <Link href="/recruiter/jobs">View Jobs</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
