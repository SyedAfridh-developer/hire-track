import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetRecruiterInterviews, getGetRecruiterInterviewsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleInterviewDialog } from "@/components/applicants/ScheduleInterviewDialog";
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin, User,
  CheckCircle, RefreshCw, AlertCircle, Calendar,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_STYLE = {
  pending:              { label: "Awaiting",  dot: "bg-blue-500",  chip: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",  icon: Clock },
  confirmed:            { label: "Confirmed", dot: "bg-green-500", chip: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", icon: CheckCircle },
  reschedule_requested: { label: "Reschedule", dot: "bg-red-500",  chip: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",   icon: RefreshCw },
  cancelled:            { label: "Cancelled", dot: "bg-gray-400",  chip: "bg-muted text-muted-foreground",  icon: AlertCircle },
};

type Interview = {
  id: number; applicationId: number; scheduledAt: string; location?: string | null;
  notes?: string | null; status: string; candidateName: string; candidateId: number;
  jobTitle: string; jobId: number; createdAt: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function formatFull(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function InterviewChip({ interview, onClick }: { interview: Interview; onClick: () => void }) {
  const s = STATUS_STYLE[interview.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium transition-opacity hover:opacity-80 ${s.chip}`}
    >
      <span className="flex items-center gap-1">
        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        <span className="truncate">{formatTime(interview.scheduledAt)} {interview.candidateName}</span>
      </span>
    </button>
  );
}

function UpcomingCard({ interview, onClick }: { interview: Interview; onClick: () => void }) {
  const s = STATUS_STYLE[interview.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
  const Icon = s.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 space-y-1.5 hover:shadow-sm transition-shadow ${s.chip} border-current/20`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-sm truncate">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{interview.candidateName}</span>
        </div>
        <span className="text-xs shrink-0 opacity-80">{s.label}</span>
      </div>
      <div className="text-xs opacity-80 space-y-0.5 pl-5">
        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{formatFull(interview.scheduledAt)}</div>
        <div className="flex items-center gap-1"><User className="h-3 w-3 shrink-0" />{interview.jobTitle}</div>
        {interview.location && <div className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{interview.location}</div>}
      </div>
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function InterviewCalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Interview | null>(null);

  const { data: interviews = [], isLoading } = useGetRecruiterInterviews({
    query: { queryKey: getGetRecruiterInterviewsQueryKey(), refetchInterval: 60_000 },
  });

  // Build calendar grid
  const days = useMemo<Date[]>(() => {
    if (view === "month") {
      const first = startOfMonth(cursor);
      const start = startOfWeek(first);
      // 6 weeks = 42 cells
      return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
  }, [view, cursor]);

  // Map date-string → interviews
  const byDay = useMemo(() => {
    const map: Record<string, Interview[]> = {};
    for (const iv of interviews as Interview[]) {
      const key = new Date(iv.scheduledAt).toDateString();
      (map[key] ??= []).push(iv);
    }
    return map;
  }, [interviews]);

  // Upcoming (future) interviews sorted
  const upcoming = useMemo(() => {
    const now = new Date();
    return (interviews as Interview[])
      .filter((iv) => new Date(iv.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 8);
  }, [interviews]);

  const today = new Date();

  function prev() {
    if (view === "month") setCursor((c) => addMonths(c, -1));
    else setCursor((c) => addDays(c, -7));
  }
  function next() {
    if (view === "month") setCursor((c) => addMonths(c, 1));
    else setCursor((c) => addDays(c, 7));
  }

  const headingLabel = view === "month"
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : (() => {
        const start = startOfWeek(cursor);
        const end = addDays(start, 6);
        return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${start.getMonth() !== end.getMonth() ? MONTHS[end.getMonth()] + " " : ""}${end.getDate()}, ${end.getFullYear()}`;
      })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Interview Calendar
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">All scheduled interviews across your job listings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 font-medium transition-colors ${view === "month" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
            >Month</button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 font-medium transition-colors ${view === "week" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
            >Week</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Calendar grid */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 flex-row items-center justify-between space-y-0 border-b">
            <button onClick={prev} className="p-1.5 rounded hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="font-semibold text-foreground">{headingLabel}</h2>
            <button onClick={next} className="p-1.5 rounded hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 grid grid-cols-7 gap-2">
                {Array.from({ length: 14 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
              </div>
            ) : (
              <>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className={`grid grid-cols-7 ${view === "month" ? "grid-rows-6" : "grid-rows-1"}`}>
                  {days.map((day, idx) => {
                    const key = day.toDateString();
                    const dayInterviews = byDay[key] ?? [];
                    const isToday = isSameDay(day, today);
                    const isCurrentMonth = view === "month" && day.getMonth() === cursor.getMonth();
                    const isOtherMonth = view === "month" && !isCurrentMonth;
                    return (
                      <div
                        key={idx}
                        className={`min-h-[80px] p-1.5 border-b border-r flex flex-col gap-1 ${
                          isOtherMonth ? "bg-muted/30" : "bg-background"
                        } ${idx % 7 === 6 ? "border-r-0" : ""} ${idx >= days.length - 7 && view === "month" ? "border-b-0" : ""}`}
                      >
                        {/* Day number */}
                        <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? "bg-primary text-primary-foreground" : isOtherMonth ? "text-muted-foreground/50" : "text-foreground"
                        }`}>
                          {day.getDate()}
                        </div>
                        {/* Interview chips */}
                        <div className="space-y-0.5">
                          {dayInterviews.slice(0, view === "week" ? 10 : 3).map((iv) => (
                            <InterviewChip key={iv.id} interview={iv} onClick={() => setSelected(iv)} />
                          ))}
                          {view === "month" && dayInterviews.length > 3 && (
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground px-1"
                              onClick={() => { setView("week"); setCursor(day); }}
                            >
                              +{dayInterviews.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming sidebar */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Upcoming Interviews</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
              ) : upcoming.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No upcoming interviews
                </div>
              ) : (
                upcoming.map((iv) => <UpcomingCard key={iv.id} interview={iv} onClick={() => setSelected(iv)} />)
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legend</p>
              {Object.entries(STATUS_STYLE).map(([, cfg]) => (
                <div key={cfg.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick link */}
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <Link href="/recruiter/jobs">View all jobs & applicants</Link>
          </Button>
        </div>
      </div>

      {/* Reschedule dialog */}
      {selected && (
        <ScheduleInterviewDialog
          applicationId={selected.applicationId}
          candidateName={selected.candidateName}
          jobTitle={selected.jobTitle}
          open={selected !== null}
          onOpenChange={(v) => { if (!v) setSelected(null); }}
        />
      )}
    </div>
  );
}
