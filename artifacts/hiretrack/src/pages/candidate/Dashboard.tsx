import { Link } from "wouter";
import { useGetCandidateDashboard, getGetCandidateDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Search, FileText, CheckCircle, XCircle, Star, TrendingUp, ArrowRight, Building2 } from "lucide-react";

const STATUS_CONFIG = {
  applied: { label: "Applied", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: FileText },
  shortlisted: { label: "Shortlisted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Star },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  hired: { label: "Hired", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle },
};

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetCandidateDashboard({
    query: { queryKey: getGetCandidateDashboardQueryKey() },
  });

  const stats = [
    { key: "totalApplications", label: "Total Applied", value: data?.totalApplications || 0, icon: FileText, color: "text-blue-600" },
    { key: "shortlisted", label: "Shortlisted", value: data?.shortlisted || 0, icon: Star, color: "text-amber-600" },
    { key: "hired", label: "Hired", value: data?.hired || 0, icon: CheckCircle, color: "text-green-600" },
    { key: "rejected", label: "Rejected", value: data?.rejected || 0, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-0.5">Here's how your job search is going</p>
        </div>
        <Button asChild>
          <Link href="/jobs">
            <Search className="h-4 w-4 mr-2" />
            Browse jobs
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.key} data-testid={`stat-${stat.key}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/jobs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Find your next role</div>
                <div className="text-sm text-muted-foreground">Search jobs by title, location, or skills</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/profile">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Update your profile</div>
                <div className="text-sm text-muted-foreground">Keep your skills and experience current</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Applications</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/applications">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !data?.recentApplications?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No applications yet. Start browsing jobs!</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/jobs">Browse jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {data.recentApplications.map((app) => {
                const cfg = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
                return (
                  <div key={app.id} className="py-3 flex items-center justify-between gap-4" data-testid={`application-row-${app.id}`}>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{app.job?.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {app.job?.company?.name}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${cfg?.color}`}>
                      {cfg?.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
