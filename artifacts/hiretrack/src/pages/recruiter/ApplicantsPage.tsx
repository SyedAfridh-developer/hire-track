import { useParams, Link } from "wouter";
import { useGetJobApplications, getGetJobApplicationsQueryKey, useGetJob, getGetJobQueryKey, useUpdateApplicationStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Users, FileText, Mail, MapPin, Tag } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "hired", label: "Hired", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
];

export default function ApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateApplicationStatus();

  const { data: job } = useGetJob(Number(jobId), {
    query: { queryKey: getGetJobQueryKey(Number(jobId)), enabled: !!jobId },
  });

  const { data: applications, isLoading } = useGetJobApplications(Number(jobId), {
    query: { queryKey: getGetJobApplicationsQueryKey(Number(jobId)), enabled: !!jobId },
  });

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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/recruiter/jobs"><ChevronLeft className="h-4 w-4 mr-1" />Back to jobs</Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Applicants</h1>
        {job && <p className="text-muted-foreground mt-0.5">for {job.title}</p>}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : !applications?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-medium text-foreground mb-1">No applicants yet</h3>
            <p className="text-sm">Share your job listing to start receiving applications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const statusCfg = STATUS_OPTIONS.find((s) => s.value === app.status);
            const profile = app.candidate;
            const user = profile?.user;
            return (
              <Card key={app.id} data-testid={`applicant-card-${app.id}`} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {user?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{user?.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user?.email}</span>
                            {profile?.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                          </div>
                        </div>
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
                      </div>

                      {profile?.headline && (
                        <p className="text-sm text-muted-foreground mb-2">{profile.headline}</p>
                      )}

                      {profile?.skills && profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {profile.skills.slice(0, 5).map((s) => (
                            <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      )}

                      {app.coverLetter && (
                        <details className="mt-2">
                          <summary className="text-xs text-primary cursor-pointer select-none">View cover letter</summary>
                          <p className="text-sm text-muted-foreground mt-2 bg-muted rounded p-3 whitespace-pre-line">{app.coverLetter}</p>
                        </details>
                      )}

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
    </div>
  );
}
