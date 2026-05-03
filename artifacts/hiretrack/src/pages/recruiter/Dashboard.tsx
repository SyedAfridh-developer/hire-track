import { Link } from "wouter";
import { useGetRecruiterDashboard, getGetRecruiterDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Briefcase, Users, Plus, TrendingUp, CheckCircle,
  FileText, ArrowRight, Radio, RefreshCw,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  applied:     "#3b82f6",
  shortlisted: "#f59e0b",
  rejected:    "#ef4444",
  hired:       "#22c55e",
};

const STATUS_CONFIG = {
  applied:     { label: "Applied",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  shortlisted: { label: "Shortlisted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  rejected:    { label: "Rejected",    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  hired:       { label: "Hired",       color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 60 * 60 * 1000;
}

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, dataUpdatedAt } = useGetRecruiterDashboard({
    query: {
      queryKey: getGetRecruiterDashboardQueryKey(),
      refetchInterval: 30_000,
    },
  });

  const stats = [
    { label: "Total Jobs",       value: data?.totalJobs        ?? 0, icon: Briefcase,   color: "text-blue-600" },
    { label: "Active Jobs",      value: data?.activeJobs       ?? 0, icon: TrendingUp,  color: "text-green-600" },
    { label: "Total Applicants", value: data?.totalApplications ?? 0, icon: Users,       color: "text-indigo-600" },
    { label: "Hired",            value: data?.applicationsByStatus?.hired ?? 0, icon: CheckCircle, color: "text-emerald-600" },
  ];

  const pieData = data?.applicationsByStatus
    ? Object.entries(data.applicationsByStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k, value: v }))
    : [];

  const newCount = data?.recentApplications?.filter((a) => isNew(a.createdAt)).length ?? 0;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruiter Dashboard</h1>
          <p className="text-muted-foreground mt-0.5">Welcome back, {user?.name?.split(" ")[0]}</p>
        </div>
        <Button asChild>
          <Link href="/recruiter/jobs/new">
            <Plus className="h-4 w-4 mr-2" />
            Post a job
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replace(" ", "-")}`}>
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pipeline chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No applications yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, STATUS_CONFIG[n as keyof typeof STATUS_CONFIG]?.label || n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[entry.name] }} />
                        <span className="text-muted-foreground">{STATUS_CONFIG[entry.name as keyof typeof STATUS_CONFIG]?.label}</span>
                      </div>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Application Activity</CardTitle>
              {/* Live indicator */}
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                LIVE
              </span>
              {newCount > 0 && (
                <span className="text-[10px] font-semibold text-white bg-primary px-1.5 py-0.5 rounded-full">
                  {newCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isFetching && !isLoading && (
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/recruiter/jobs">View jobs <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !data?.recentApplications?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No applications yet. Post a job to get started.</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/recruiter/jobs/new">Post a job</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y -mx-1">
                  {data.recentApplications.map((app) => {
                    const cfg = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
                    const name = app.candidate?.user?.name ?? "Unknown";
                    const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    const fresh = isNew(app.createdAt);

                    return (
                      <div
                        key={app.id}
                        className={`flex items-center gap-3 py-2.5 px-1 rounded-lg transition-colors ${fresh ? "hover:bg-primary/5" : "hover:bg-muted/50"}`}
                        data-testid={`app-row-${app.id}`}
                      >
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${fresh ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {initials}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-foreground leading-tight">{name}</span>
                            {fresh && (
                              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wide">New</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            Applied for{" "}
                            <Link
                              href={`/recruiter/jobs/${app.job?.id}/applicants`}
                              className="text-foreground hover:text-primary hover:underline font-medium"
                            >
                              {app.job?.title}
                            </Link>
                          </p>
                        </div>

                        {/* Right side: badge + time */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg?.color}`}>
                            {cfg?.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{relativeTime(app.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Feed footer */}
                <div className="mt-3 pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Auto-refreshes every 30s
                  </span>
                  {lastUpdated && <span>Updated {lastUpdated}</span>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Jobs */}
      {data?.topJobs && data.topJobs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Top Jobs by Applications</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/recruiter/jobs">All jobs <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.topJobs.map((job) => (
                <div key={job.id} className="py-3 flex items-center justify-between gap-4" data-testid={`top-job-${job.id}`}>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{job.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{job.location} · {job.jobType}</div>
                  </div>
                  <Link
                    href={`/recruiter/jobs/${job.id}/applicants`}
                    className="text-sm font-medium text-primary hover:underline shrink-0"
                  >
                    {job.applicationCount} applicant{job.applicationCount !== 1 ? "s" : ""} →
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
