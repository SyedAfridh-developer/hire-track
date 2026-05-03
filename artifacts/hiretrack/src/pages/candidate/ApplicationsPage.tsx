import { Link } from "wouter";
import { useGetMyApplications, getGetMyApplicationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Clock, FileText, ExternalLink, CheckCircle, XCircle, Star, Briefcase } from "lucide-react";

const STATUS_CONFIG = {
  applied: { label: "Applied", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", Icon: FileText },
  shortlisted: { label: "Shortlisted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", Icon: Star },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", Icon: XCircle },
  hired: { label: "Hired", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", Icon: CheckCircle },
};

export default function ApplicationsPage() {
  const { data: applications, isLoading } = useGetMyApplications({
    query: { queryKey: getGetMyApplicationsQueryKey() },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="text-muted-foreground mt-0.5">Track the status of all your job applications</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : !applications?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-medium text-foreground mb-1">No applications yet</h3>
            <p className="text-sm mb-6">Start applying to jobs to see them here.</p>
            <Button asChild>
              <Link href="/jobs">Browse jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const cfg = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
            return (
              <Card key={app.id} data-testid={`application-card-${app.id}`} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{app.job?.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {app.job?.company?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {app.job?.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Applied {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {app.coverLetter && (
                        <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded line-clamp-2">
                          {app.coverLetter}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg?.color}`} data-testid={`status-${app.id}`}>
                        {cfg?.label}
                      </span>
                      <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                        <Link href={`/jobs/${app.jobId}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View job
                        </Link>
                      </Button>
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
