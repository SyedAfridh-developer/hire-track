import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetJob, getGetJobQueryKey, useApplyForJob, getGetMyApplicationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Building2, Clock, Briefcase, DollarSign, ChevronLeft, CheckCircle, Loader2 } from "lucide-react";

const jobTypeColors: Record<string, string> = {
  "full-time": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "contract": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "internship": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "remote": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applied, setApplied] = useState(false);

  const { data: job, isLoading } = useGetJob(Number(jobId), {
    query: { queryKey: getGetJobQueryKey(Number(jobId)), enabled: !!jobId },
  });

  const applyMutation = useApplyForJob();

  function handleApply() {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    setApplyOpen(true);
  }

  async function submitApplication() {
    if (!job) return;
    applyMutation.mutate(
      { data: { jobId: job.id, coverLetter: coverLetter || undefined } },
      {
        onSuccess: () => {
          setApplyOpen(false);
          setApplied(true);
          queryClient.invalidateQueries({ queryKey: getGetMyApplicationsQueryKey() });
          toast({ title: "Application submitted!", description: "You've applied successfully." });
        },
        onError: (err: any) => {
          toast({
            title: "Application failed",
            description: err?.data?.message || "Failed to submit application.",
            variant: "destructive",
          });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Job not found.</p>
        <Button variant="outline" className="mt-4" asChild><Link href="/jobs">Back to jobs</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/jobs"><ChevronLeft className="h-4 w-4 mr-1" />Back to jobs</Link>
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {job.company?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(job.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${jobTypeColors[job.jobType] || ""}`}>
                  {job.jobType}
                </span>
              </div>

              {(job.salaryMin || job.salaryMax) && (
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
                  <DollarSign className="h-4 w-4 text-primary" />
                  {job.salaryMin && job.salaryMax
                    ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()} / year`
                    : job.salaryMin
                    ? `From $${job.salaryMin.toLocaleString()} / year`
                    : `Up to $${job.salaryMax!.toLocaleString()} / year`}
                </div>
              )}

              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-sm text-foreground/80 leading-relaxed">
                {job.description}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skills Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span key={skill} className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              {applied ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-medium">Applied!</p>
                  <p className="text-sm text-muted-foreground mt-1">We'll notify you of any updates.</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/applications">View applications</Link>
                  </Button>
                </div>
              ) : role === "recruiter" ? (
                <p className="text-sm text-muted-foreground text-center">Recruiter accounts cannot apply for jobs.</p>
              ) : (
                <>
                  <Button className="w-full" onClick={handleApply} data-testid="button-apply">
                    Apply for this role
                  </Button>
                  {!isAuthenticated && (
                    <p className="text-xs text-muted-foreground text-center">
                      You'll be asked to sign in first
                    </p>
                  )}
                </>
              )}

              <div className="pt-3 border-t space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Job type</span>
                  <span className="font-medium capitalize">{job.jobType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Applicants</span>
                  <span className="font-medium">{job.applicationCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium ${job.isActive ? "text-green-600" : "text-red-500"}`}>
                    {job.isActive ? "Active" : "Closed"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {job.company && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">About {job.company.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1.5">
                {job.company.industry && <div>{job.company.industry}</div>}
                {job.company.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.company.location}
                  </div>
                )}
                {job.company.size && <div>{job.company.size} employees</div>}
                {job.company.description && <p className="mt-2">{job.company.description}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>
              Your profile and resume will be shared with the recruiter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cover Letter (optional)</Label>
              <Textarea
                className="mt-1.5"
                placeholder="Tell the recruiter why you're a great fit..."
                rows={5}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                data-testid="input-cover-letter"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={submitApplication} disabled={applyMutation.isPending} data-testid="button-submit-application">
              {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
