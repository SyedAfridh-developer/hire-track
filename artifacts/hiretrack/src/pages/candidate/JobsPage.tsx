import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useListJobs, getListJobsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Building2, Clock, ChevronLeft, ChevronRight, Filter, BellPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CreateAlertDialog } from "@/components/alerts/CreateAlertDialog";

const JOB_TYPES = ["all", "full-time", "part-time", "contract", "internship", "remote"];

const jobTypeColors: Record<string, string> = {
  "full-time": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "contract": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "internship": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "remote": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

export default function JobsPage() {
  const { isAuthenticated, role } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("all");
  const [page, setPage] = useState(1);
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 350);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(location), 350);
    return () => clearTimeout(t);
  }, [location]);

  const params = {
    page,
    limit: 10,
    ...(debouncedKeyword && { keyword: debouncedKeyword }),
    ...(debouncedLocation && { location: debouncedLocation }),
    ...(jobType !== "all" && { jobType: jobType as any }),
  };

  const { data, isLoading } = useListJobs(params, {
    query: { queryKey: getListJobsQueryKey(params) },
  });

  const handleSearch = useCallback(() => setPage(1), []);

  useEffect(() => { setPage(1); }, [debouncedKeyword, debouncedLocation, jobType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Browse Jobs</h1>
          <p className="text-muted-foreground mt-0.5">Find your next opportunity from thousands of listings</p>
        </div>
        {isAuthenticated && role === "candidate" && (
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setAlertOpen(true)}>
            <BellPlus className="h-4 w-4" />
            Create Alert
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Job title, keywords..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                data-testid="input-keyword"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-testid="input-location"
              />
            </div>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-jobtype">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Job type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t === "all" ? "All types" : t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results header */}
      {!isLoading && data && (
        <div className="text-sm text-muted-foreground">
          {data.total} job{data.total !== 1 ? "s" : ""} found
          {debouncedKeyword && ` for "${debouncedKeyword}"`}
        </div>
      )}

      {/* Job list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          : !data?.jobs?.length
          ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No jobs found. Try adjusting your filters.</p>
              </CardContent>
            </Card>
          )
          : data.jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} data-testid={`job-card-${job.id}`}>
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
                      <div className="text-right shrink-0 hidden sm:block">
                        <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {job.applicationCount} applicant{job.applicationCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.totalPages}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <CreateAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        prefill={{
          keyword: debouncedKeyword || undefined,
          location: debouncedLocation || undefined,
          jobType: jobType !== "all" ? jobType : undefined,
        }}
      />
    </div>
  );
}
