import { Link } from "wouter";
import { useGetSavedJobs, getGetSavedJobsQueryKey, useUnsaveJob } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Building2, MapPin, Clock, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const jobTypeColors: Record<string, string> = {
  "full-time": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "contract": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "internship": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "remote": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

export default function SavedJobsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedJobs, isLoading } = useGetSavedJobs({
    query: { queryKey: getGetSavedJobsQueryKey() },
  });

  const unsave = useUnsaveJob();

  function handleUnsave(jobId: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    unsave.mutate(
      { jobId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSavedJobsQueryKey() });
          toast({ title: "Job removed from saved" });
        },
        onError: () => toast({ title: "Failed to remove job", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saved Jobs</h1>
        <p className="text-muted-foreground mt-0.5">Jobs you've bookmarked for later</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : !savedJobs?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">No saved jobs yet</p>
            <p className="text-sm mb-4">Bookmark jobs while browsing to review them here.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/jobs">
                <Search className="h-4 w-4 mr-2" />
                Browse jobs
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedJobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${jobTypeColors[job.jobType] || ""}`}>
                          {job.jobType}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {job.company?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                        {(job.salaryMin || job.salaryMax) && (
                          <span className="font-medium text-foreground">
                            {job.salaryMin && job.salaryMax
                              ? `$${Math.round(job.salaryMin / 1000)}k – $${Math.round(job.salaryMax / 1000)}k`
                              : job.salaryMin
                              ? `From $${Math.round(job.salaryMin / 1000)}k`
                              : `Up to $${Math.round(job.salaryMax! / 1000)}k`}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 5).map((skill) => (
                          <span key={skill} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 5 && (
                          <span className="text-xs text-muted-foreground">+{job.skills.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleUnsave(job.id, e)}
                        title="Remove from saved"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
