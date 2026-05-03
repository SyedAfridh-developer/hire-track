import { Link } from "wouter";
import { useListJobs, getListJobsQueryKey, useDeleteJob } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, MapPin, Briefcase, TrendingUp, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const jobTypeColors: Record<string, string> = {
  "full-time": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "contract": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "internship": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "remote": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

export default function RecruiterJobsListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteJob = useDeleteJob();

  const { data, isLoading } = useListJobs({ limit: 50 }, {
    query: { queryKey: getListJobsQueryKey({ limit: 50 }) },
  });

  function handleDelete(jobId: number) {
    deleteJob.mutate(
      { jobId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ limit: 50 }) });
          toast({ title: "Job deleted successfully" });
        },
        onError: () => toast({ title: "Failed to delete job", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Job Postings</h1>
          <p className="text-muted-foreground mt-0.5">Manage your job listings and view applicants</p>
        </div>
        <Button asChild data-testid="button-post-job">
          <Link href="/recruiter/jobs/new"><Plus className="h-4 w-4 mr-2" />Post a job</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : !data?.jobs?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-medium text-foreground mb-1">No jobs posted yet</h3>
            <p className="text-sm mb-6">Create your first job posting to start receiving applications.</p>
            <Button asChild><Link href="/recruiter/jobs/new">Post a job</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.jobs.map((job) => (
            <Card key={job.id} data-testid={`job-row-${job.id}`} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{job.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${jobTypeColors[job.jobType] || ""}`}>{job.jobType}</span>
                      {!job.isActive && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{job.applicationCount} applicant{job.applicationCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {job.skills.slice(0, 4).map((s) => (
                        <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/recruiter/jobs/${job.id}/applicants`} data-testid={`button-applicants-${job.id}`}>
                        <Users className="h-3.5 w-3.5 mr-1" />Applicants
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/recruiter/jobs/${job.id}/edit`} data-testid={`button-edit-${job.id}`}><Edit className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" data-testid={`button-delete-${job.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete job posting?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{job.title}" and all its applications. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(job.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
