import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useLocation, Link } from "wouter";
import { useGetJob, getGetJobQueryKey, useCreateJob, useUpdateJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Briefcase } from "lucide-react";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  location: z.string().min(2, "Location is required"),
  jobType: z.enum(["full-time", "part-time", "contract", "internship", "remote"]),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  skillsInput: z.string().min(1, "At least one skill required"),
});
type FormData = z.infer<typeof schema>;

export default function JobFormPage() {
  const { jobId } = useParams<{ jobId?: string }>();
  const isEdit = !!jobId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const { data: existingJob, isLoading: loadingJob } = useGetJob(Number(jobId), {
    query: { queryKey: getGetJobQueryKey(Number(jobId)), enabled: isEdit && !!jobId },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", location: "", jobType: "full-time", skillsInput: "" },
    values: existingJob && isEdit ? {
      title: existingJob.title,
      description: existingJob.description,
      location: existingJob.location,
      jobType: existingJob.jobType as any,
      salaryMin: existingJob.salaryMin || undefined,
      salaryMax: existingJob.salaryMax || undefined,
      skillsInput: existingJob.skills.join(", "),
    } : undefined,
  });

  async function onSubmit(values: FormData) {
    const skills = values.skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = {
      title: values.title,
      description: values.description,
      location: values.location,
      jobType: values.jobType,
      salaryMin: values.salaryMin,
      salaryMax: values.salaryMax,
      skills,
    };

    if (isEdit) {
      updateJob.mutate(
        { jobId: Number(jobId), data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ limit: 50 }) });
            toast({ title: "Job updated!" });
            setLocation("/recruiter/jobs");
          },
          onError: (err: any) => toast({ title: "Update failed", description: err?.data?.message, variant: "destructive" }),
        }
      );
    } else {
      createJob.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ limit: 50 }) });
            toast({ title: "Job posted successfully!" });
            setLocation("/recruiter/jobs");
          },
          onError: (err: any) => toast({ title: "Failed to post job", description: err?.data?.message, variant: "destructive" }),
        }
      );
    }
  }

  if (isEdit && loadingJob) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  const isPending = createJob.isPending || updateJob.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/recruiter/jobs"><ChevronLeft className="h-4 w-4 mr-1" />Back to jobs</Link>
      </Button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Job" : "Post a New Job"}</h1>
          <p className="text-muted-foreground text-sm">{isEdit ? "Update your job posting" : "Fill in the details to attract the right candidates"}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Senior Frontend Engineer" data-testid="input-title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="jobType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-job-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="San Francisco, CA or Remote" data-testid="input-location" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="salaryMin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Min (USD/year)</FormLabel>
                    <FormControl><Input type="number" placeholder="80000" data-testid="input-salary-min" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="salaryMax" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Max (USD/year)</FormLabel>
                    <FormControl><Input type="number" placeholder="120000" data-testid="input-salary-max" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="skillsInput" render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Skills</FormLabel>
                  <FormControl><Input placeholder="React, TypeScript, Node.js" data-testid="input-skills" {...field} /></FormControl>
                  <FormDescription>Comma-separated list of skills</FormDescription>
                  <FormMessage />
                  {field.value && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {field.value.split(",").filter(s => s.trim()).map((s) => (
                        <span key={s} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{s.trim()}</span>
                      ))}
                    </div>
                  )}
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl><Textarea placeholder="Describe the role, responsibilities, requirements, and what you offer..." rows={8} data-testid="input-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/recruiter/jobs">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-submit-job">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isEdit ? "Update job" : "Post job"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
