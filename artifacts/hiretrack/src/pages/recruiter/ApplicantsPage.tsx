import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetJobApplications, getGetJobApplicationsQueryKey,
  useGetJob, getGetJobQueryKey,
  useUpdateApplicationStatus,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Users, FileText, Mail, MapPin, MessageCircle,
  ArrowUpDown, TrendingUp, X, CheckSquare, CalendarClock, ClipboardList, Star, Clock,
} from "lucide-react";
import { MessageThread } from "@/components/messages/MessageThread";
import { ApplicantNotes } from "@/components/applicants/ApplicantNotes";
import { ScheduleInterviewDialog } from "@/components/applicants/ScheduleInterviewDialog";
import { SendAssessmentDialog } from "@/components/recruiter/SendAssessmentDialog";

interface AssessmentSubmission {
  id: number;
  applicationId: number;
  status: "pending" | "submitted" | "scored";
  score: number | null;
  maxScore: number;
}

function AssessmentScoreBadge({ submission }: { submission: AssessmentSubmission }) {
  if (submission.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
        <ClipboardList className="h-2.5 w-2.5" /> Quiz sent
      </span>
    );
  }
  if (submission.status === "submitted" || (submission.status === "scored" && submission.score === null)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
        <Clock className="h-2.5 w-2.5" /> Pending review
      </span>
    );
  }
  const pct = submission.maxScore > 0 ? Math.round((submission.score! / submission.maxScore) * 100) : 100;
  const color = pct >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : pct >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      <Star className="h-2.5 w-2.5" /> {submission.score}/{submission.maxScore} ({pct}%)
    </span>
  );
}

const STATUS_OPTIONS = [
  { value: "applied",     label: "Applied",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "rejected",    label: "Rejected",    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "hired",       label: "Hired",       color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
];

function computeMatchScore(candidateSkills: string[], jobSkills: string[]): number {
  if (!jobSkills.length) return -1;
  if (!candidateSkills.length) return 0;
  const matched = jobSkills.filter((js) =>
    candidateSkills.some((cs) => cs.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(cs.toLowerCase()))
  );
  return Math.round((matched.length / jobSkills.length) * 100);
}

function getMatchedAndMissing(candidateSkills: string[], jobSkills: string[]) {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const js of jobSkills) {
    const found = candidateSkills.some(
      (cs) => cs.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(cs.toLowerCase())
    );
    if (found) matched.push(js);
    else missing.push(js);
  }
  return { matched, missing };
}

function ScoreBadge({ score }: { score: number }) {
  if (score === -1) {
    return (
      <div className="flex flex-col items-center shrink-0">
        <div className="w-12 h-12 rounded-full border-2 border-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">N/A</span>
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5">match</span>
      </div>
    );
  }
  const color =
    score >= 70 ? { ring: "border-green-500", text: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" }
    : score >= 40 ? { ring: "border-amber-500", text: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" }
    : { ring: "border-red-400", text: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" };

  return (
    <div className="flex flex-col items-center shrink-0">
      <div className={`w-12 h-12 rounded-full border-2 ${color.ring} ${color.bg} flex items-center justify-center`}>
        <span className={`text-xs font-bold ${color.text}`}>{score}%</span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5">match</span>
    </div>
  );
}

export default function ApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateApplicationStatus();
  const [messagingAppId, setMessagingAppId] = useState<number | null>(null);
  const [interviewApp, setInterviewApp] = useState<{ id: number; name: string } | null>(null);
  const [assessmentApp, setAssessmentApp] = useState<{ id: number; name: string } | null>(null);
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [sortByScore, setSortByScore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/assessments/submissions", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => Array.isArray(d) ? setSubmissions(d) : {})
      .catch(() => {});
  }, []);

  const { data: job } = useGetJob(Number(jobId), {
    query: { queryKey: getGetJobQueryKey(Number(jobId)), enabled: !!jobId },
  });

  const { data: applications, isLoading } = useGetJobApplications(Number(jobId), {
    query: { queryKey: getGetJobApplicationsQueryKey(Number(jobId)), enabled: !!jobId },
  });

  const jobSkills = job?.skills ?? [];

  const scoredApplications = useMemo(() => {
    if (!applications) return [];
    const withScores = applications.map((app) => ({
      ...app,
      matchScore: computeMatchScore(app.candidate?.skills ?? [], jobSkills),
    }));
    if (sortByScore) {
      return [...withScores].sort((a, b) => b.matchScore - a.matchScore);
    }
    return withScores;
  }, [applications, jobSkills, sortByScore]);

  const allIds = useMemo(() => scoredApplications.map((a) => a.id), [scoredApplications]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [allSelected, allIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  function handleStatusChange(applicationId: number, status: string) {
    updateStatus.mutate(
      { applicationId, data: { status: status as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetJobApplicationsQueryKey(Number(jobId)) });
          toast({ title: "Status updated" });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
      }
    );
  }

  async function handleBulkStatusChange(status: string) {
    setIsBulkUpdating(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    await Promise.all(
      ids.map(
        (applicationId) =>
          new Promise<void>((resolve) => {
            updateStatus.mutate(
              { applicationId, data: { status: status as any } },
              { onSuccess: () => { successCount++; resolve(); }, onError: () => resolve() }
            );
          })
      )
    );
    await queryClient.invalidateQueries({ queryKey: getGetJobApplicationsQueryKey(Number(jobId)) });
    setIsBulkUpdating(false);
    setSelectedIds(new Set());
    toast({
      title: `Updated ${successCount} of ${ids.length} applicant${ids.length > 1 ? "s" : ""}`,
      description: `Status set to "${STATUS_OPTIONS.find((s) => s.value === status)?.label}"`,
    });
  }

  const avgScore = useMemo(() => {
    const scored = scoredApplications.filter((a) => a.matchScore >= 0);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, a) => s + a.matchScore, 0) / scored.length);
  }, [scoredApplications]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/recruiter/jobs"><ChevronLeft className="h-4 w-4 mr-1" />Back to jobs</Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applicants</h1>
          {job && <p className="text-muted-foreground mt-0.5">for {job.title}</p>}
        </div>
        {scoredApplications.length > 0 && jobSkills.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            {avgScore !== null && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                <TrendingUp className="h-3.5 w-3.5" />
                Avg match: <span className="font-semibold text-foreground">{avgScore}%</span>
              </div>
            )}
            <Button
              variant={sortByScore ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setSortByScore((v) => !v)}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortByScore ? "Sorted by match" : "Sort by match"}
            </Button>
          </div>
        )}
      </div>

      {/* Bulk action toolbar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 sticky top-2 z-10 backdrop-blur-sm">
          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} candidate{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex-1" />
          <Select
            onValueChange={(val) => handleBulkStatusChange(val)}
            disabled={isBulkUpdating}
          >
            <SelectTrigger className="w-44 h-8 text-xs bg-background">
              <SelectValue placeholder="Set status for all…" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            disabled={isBulkUpdating}
            onClick={() => handleBulkStatusChange("rejected")}
          >
            Reject all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={clearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
        </div>
      ) : !scoredApplications.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-medium text-foreground mb-1">No applicants yet</h3>
            <p className="text-sm">Share your job listing to start receiving applications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select-all row */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all applicants"
            />
            <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer select-none">
              {allSelected ? "Deselect all" : `Select all ${allIds.length} applicants`}
            </label>
          </div>

          {scoredApplications.map((app) => {
            const statusCfg = STATUS_OPTIONS.find((s) => s.value === app.status);
            const profile = app.candidate;
            const user = profile?.user;
            const { matched, missing } = getMatchedAndMissing(profile?.skills ?? [], jobSkills);
            const isSelected = selectedIds.has(app.id);

            return (
              <Card
                key={app.id}
                data-testid={`applicant-card-${app.id}`}
                className={`hover:shadow-sm transition-all ${isSelected ? "ring-2 ring-primary/40 shadow-sm" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-1 shrink-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(app.id)}
                        aria-label={`Select ${user?.name ?? "applicant"}`}
                      />
                    </div>

                    {/* Match score ring */}
                    {jobSkills.length > 0 && <ScoreBadge score={app.matchScore} />}

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {user?.name?.charAt(0).toUpperCase() || "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{user?.name}</h3>
                            {statusCfg && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                            )}
                            {(() => {
                              const sub = submissions.find((s) => s.applicationId === app.id);
                              return sub ? <AssessmentScoreBadge submission={sub} /> : null;
                            })()}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user?.email}</span>
                            {profile?.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={app.status}
                            onValueChange={(val) => handleStatusChange(app.id, val)}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs" data-testid={`status-select-${app.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setMessagingAppId(app.id)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Message
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setInterviewApp({ id: app.id, name: user?.name ?? "Candidate" })}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Interview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setAssessmentApp({ id: app.id, name: user?.name ?? "Candidate" })}
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            Quiz
                          </Button>
                        </div>
                      </div>

                      {profile?.headline && (
                        <p className="text-sm text-muted-foreground mb-2">{profile.headline}</p>
                      )}

                      {jobSkills.length > 0 && (matched.length > 0 || missing.length > 0) ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {matched.map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-medium">
                              ✓ {s}
                            </span>
                          ))}
                          {missing.map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 line-through opacity-70">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : profile?.skills && profile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {profile.skills.slice(0, 6).map((s) => (
                            <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{s}</span>
                          ))}
                          {profile.skills.length > 6 && (
                            <span className="text-xs text-muted-foreground">+{profile.skills.length - 6} more</span>
                          )}
                        </div>
                      ) : null}

                      {app.coverLetter && (
                        <details className="mt-2">
                          <summary className="text-xs text-primary cursor-pointer select-none">View cover letter</summary>
                          <p className="text-sm text-muted-foreground mt-2 bg-muted rounded p-3 whitespace-pre-line">{app.coverLetter}</p>
                        </details>
                      )}

                      <ApplicantNotes applicationId={app.id} />

                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span>Applied {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        {app.resumeUrl && (
                          <a
                            href={app.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                            data-testid={`resume-link-${app.id}`}
                          >
                            <FileText className="h-3 w-3" /> View resume
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {messagingAppId !== null && (
        <MessageThread
          applicationId={messagingAppId}
          open={messagingAppId !== null}
          onClose={() => setMessagingAppId(null)}
        />
      )}

      {interviewApp !== null && (
        <ScheduleInterviewDialog
          applicationId={interviewApp.id}
          candidateName={interviewApp.name}
          jobTitle={job?.title ?? ""}
          open={interviewApp !== null}
          onOpenChange={(v) => { if (!v) setInterviewApp(null); }}
        />
      )}

      {assessmentApp !== null && (
        <SendAssessmentDialog
          open={assessmentApp !== null}
          onOpenChange={(v) => { if (!v) setAssessmentApp(null); }}
          applicationId={assessmentApp.id}
          candidateName={assessmentApp.name}
        />
      )}
    </div>
  );
}
