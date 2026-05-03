import { useGetRecruiterAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Briefcase, Users, TrendingUp, Award, MousePointerClick, UserCheck, Link2 } from "lucide-react";
import { useState, useEffect } from "react";

const STATUS_COLORS: Record<string, string> = {
  applied:     "#3b82f6",
  shortlisted: "#f59e0b",
  rejected:    "#ef4444",
  hired:       "#22c55e",
};

const STATUS_LABELS: Record<string, string> = {
  applied:     "Applied",
  shortlisted: "Shortlisted",
  rejected:    "Rejected",
  hired:       "Hired",
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Briefcase;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface LeaderboardEntry {
  id: number;
  code: string;
  label: string;
  clickCount: number;
  convertCount: number;
  jobTitle: string;
  jobId: number;
}

function useReferralLeaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/referral/leaderboard", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

export default function AnalyticsPage() {
  const { data, isLoading } = useGetRecruiterAnalytics();
  const { data: leaderboard, loading: lbLoading } = useReferralLeaderboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-0.5">Track your hiring performance over time</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Briefcase}   label="Total Jobs"         value={data?.totalJobs ?? 0}         color="bg-blue-500"   sub={`${data?.activeJobs ?? 0} currently open`} />
            <StatCard icon={Users}       label="Total Applications" value={data?.totalApplications ?? 0} color="bg-violet-500" sub="across all listings" />
            <StatCard icon={TrendingUp}  label="Active Listings"    value={data?.activeJobs ?? 0}         color="bg-amber-500"  sub="accepting applications" />
            <StatCard icon={Award}       label="Candidates Hired"   value={data?.hiredCount ?? 0}         color="bg-green-500"  sub="all time" />
          </>
        )}
      </div>

      {/* Applications over time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Applications — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : !data?.applicationsOverTime.some((d) => d.count > 0) ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              No applications yet — share your job listings to start receiving candidates.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data!.applicationsOverTime} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(v) => formatDate(v as string)}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area type="monotone" dataKey="count" name="Applications" stroke="#6366f1" strokeWidth={2} fill="url(#appGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: status pie + top jobs bar */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Application Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !data?.statusBreakdown.length ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data!.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    label={({ name, percent }) => `${STATUS_LABELS[name] ?? name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {data!.statusBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, STATUS_LABELS[name as string] ?? name]}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value) => STATUS_LABELS[value] ?? value}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Referral leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Referral Link Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lbLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : leaderboard.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <Link2 className="h-8 w-8 opacity-25" />
                <span>No referral links yet. Use the Share button on any job to create one.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 pr-3 font-medium">#</th>
                      <th className="pb-2 pr-3 font-medium">Label</th>
                      <th className="pb-2 pr-3 font-medium">Job</th>
                      <th className="pb-2 pr-3 font-medium text-right">
                        <span className="flex items-center justify-end gap-1"><MousePointerClick className="h-3 w-3" />Clicks</span>
                      </th>
                      <th className="pb-2 pr-3 font-medium text-right">
                        <span className="flex items-center justify-end gap-1"><UserCheck className="h-3 w-3" />Applied</span>
                      </th>
                      <th className="pb-2 font-medium text-right">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const rate = entry.clickCount > 0
                        ? Math.round((entry.convertCount / entry.clickCount) * 100)
                        : 0;
                      return (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                          <td className="py-2 pr-3 font-medium text-foreground">{entry.label}</td>
                          <td className="py-2 pr-3 text-muted-foreground truncate max-w-[140px]">{entry.jobTitle}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{entry.clickCount}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-green-600 dark:text-green-400 font-medium">{entry.convertCount}</td>
                          <td className="py-2 text-right">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${rate >= 20 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : rate > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top jobs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Jobs by Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !data?.topJobs.length ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data!.topJobs}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={110}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + "…" : v}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Applicants"]}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="applicantCount" name="Applicants" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
