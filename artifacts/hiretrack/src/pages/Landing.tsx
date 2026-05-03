import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetFeaturedJobs } from "@workspace/api-client-react";
import { BriefcaseBusiness, Search, Users, TrendingUp, MapPin, Clock, Building2, ArrowRight, CheckCircle } from "lucide-react";

export default function Landing() {
  const { data: featuredJobs, isLoading } = useGetFeaturedJobs();

  const jobTypeColors: Record<string, string> = {
    "full-time": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "part-time": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "contract": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "internship": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "remote": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <TrendingUp className="h-3.5 w-3.5" />
            Over 2,400 jobs posted this month
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
            Find your next role.<br />
            <span className="text-primary">Track every step.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            HireTrack connects serious candidates with top employers. Search jobs, track applications, and manage your career — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="font-semibold">
              <Link href="/register">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/jobs">Browse jobs <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {["No credit card required", "Free for candidates", "500+ active recruiters"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { label: "Active Jobs", value: "12,400+" },
              { label: "Companies Hiring", value: "840+" },
              { label: "Candidates Placed", value: "58,000+" },
              { label: "Avg. Time to Hire", value: "12 days" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Opportunities</h2>
              <p className="text-muted-foreground mt-1">Hand-picked roles from top companies</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/jobs">View all jobs</Link>
            </Button>
          </div>

          <div className="grid gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))
              : (featuredJobs || []).map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} data-testid={`job-card-${job.id}`}>
                    <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-foreground">{job.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${jobTypeColors[job.jobType] || ""}`}>
                                {job.jobType}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 4 && (
                            <span className="text-xs text-muted-foreground px-1">+{job.skills.length - 4} more</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Built for both sides of the table</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <Card className="border-primary/20">
              <CardContent className="p-8">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">For Candidates</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {["Search and filter thousands of jobs", "Upload your resume once, apply everywhere", "Track every application in real time", "Get notified when status changes"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <Link href="/register?role=candidate">Find jobs now</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-8">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">For Recruiters</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {["Post jobs in minutes", "View all applicants in one dashboard", "Move candidates through your pipeline", "Analytics on your job performance"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <Link href="/register?role=recruiter">Start hiring</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BriefcaseBusiness className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">HireTrack</span>
        </div>
        <p>The modern job portal for serious candidates and recruiters.</p>
      </footer>
    </div>
  );
}
