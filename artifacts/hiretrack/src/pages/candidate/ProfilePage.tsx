import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetProfile, getGetProfileQueryKey, useUpdateProfile, useUploadResume } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Upload, FileText, User, Briefcase, GraduationCap, Tag, FileDown } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  skills: z.string().optional(),
  experience: z.array(z.object({
    title: z.string().min(1, "Title required"),
    company: z.string().min(1, "Company required"),
    startDate: z.string().min(1, "Start date required"),
    endDate: z.string().optional(),
    current: z.boolean(),
    description: z.string().optional(),
  })),
  education: z.array(z.object({
    degree: z.string().min(1, "Degree required"),
    institution: z.string().min(1, "Institution required"),
    field: z.string().min(1, "Field required"),
    startYear: z.coerce.number().min(1950).max(2030),
    endYear: z.coerce.number().min(1950).max(2030).optional(),
  })),
});
type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const updateProfile = useUpdateProfile();
  const uploadResume = useUploadResume();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      headline: profile?.headline || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      phone: profile?.phone || "",
      skills: (profile?.skills || []).join(", "),
      experience: (profile?.experience as any[] || []),
      education: (profile?.education as any[] || []),
    },
    values: profile ? {
      headline: profile.headline || "",
      bio: profile.bio || "",
      location: profile.location || "",
      phone: profile.phone || "",
      skills: (profile.skills || []).join(", "),
      experience: (profile.experience as any[] || []),
      education: (profile.education as any[] || []),
    } : undefined,
  });

  const expFields = useFieldArray({ control: form.control, name: "experience" });
  const eduFields = useFieldArray({ control: form.control, name: "education" });

  async function onSubmit(values: FormData) {
    const skills = values.skills
      ? values.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    updateProfile.mutate(
      { data: { ...values, skills, experience: values.experience as any, education: values.education as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Profile updated!" });
        },
        onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
      }
    );
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast({ title: "Please select a PDF file", variant: "destructive" });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadResume.mutate(
        { data: { fileName: file.name, fileData: base64 } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
            toast({ title: "Resume uploaded!" });
            setUploading(false);
          },
          onError: () => {
            toast({ title: "Upload failed", variant: "destructive" });
            setUploading(false);
          },
        }
      );
    };
    reader.readAsDataURL(file);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-0.5">Keep your profile up to date to attract recruiters</p>
        </div>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/resume">
            <FileDown className="h-4 w-4" />
            Generate Resume
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="headline" render={({ field }) => (
                <FormItem>
                  <FormLabel>Headline</FormLabel>
                  <FormControl><Input placeholder="e.g. Senior Frontend Engineer" data-testid="input-headline" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl><Textarea placeholder="Tell recruiters about yourself..." rows={3} data-testid="input-bio" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="City, State" data-testid="input-location" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+1 555-0100" data-testid="input-phone" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" />Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="skills" render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills (comma-separated)</FormLabel>
                  <FormControl><Input placeholder="React, TypeScript, Node.js, PostgreSQL" data-testid="input-skills" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {form.watch("skills") && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {form.watch("skills")!.split(",").filter(s => s.trim()).map((s) => (
                    <span key={s} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{s.trim()}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" />Experience</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => expFields.append({ title: "", company: "", startDate: "", endDate: "", current: false, description: "" })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {expFields.fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No experience added yet.</p>
              )}
              {expFields.fields.map((field, i) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Position {i + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => expFields.remove(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <FormField control={form.control} name={`experience.${i}.title`} render={({ field }) => (
                      <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`experience.${i}.company`} render={({ field }) => (
                      <FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="Company Name" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`experience.${i}.startDate`} render={({ field }) => (
                      <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input placeholder="2020-01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`experience.${i}.endDate`} render={({ field }) => (
                      <FormItem><FormLabel>End Date</FormLabel><FormControl><Input placeholder="2023-06" disabled={form.watch(`experience.${i}.current`)} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name={`experience.${i}.current`} render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal cursor-pointer">I currently work here</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`experience.${i}.description`} render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="What did you do?" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" />Education</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => eduFields.append({ degree: "", institution: "", field: "", startYear: 2020, endYear: undefined })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {eduFields.fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No education added yet.</p>
              )}
              {eduFields.fields.map((field, i) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Education {i + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => eduFields.remove(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <FormField control={form.control} name={`education.${i}.degree`} render={({ field }) => (
                      <FormItem><FormLabel>Degree</FormLabel><FormControl><Input placeholder="B.S. Computer Science" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`education.${i}.institution`} render={({ field }) => (
                      <FormItem><FormLabel>Institution</FormLabel><FormControl><Input placeholder="University Name" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`education.${i}.field`} render={({ field }) => (
                      <FormItem><FormLabel>Field of Study</FormLabel><FormControl><Input placeholder="Computer Science" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name={`education.${i}.startYear`} render={({ field }) => (
                        <FormItem><FormLabel>Start Year</FormLabel><FormControl><Input type="number" placeholder="2018" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`education.${i}.endYear`} render={({ field }) => (
                        <FormItem><FormLabel>End Year</FormLabel><FormControl><Input type="number" placeholder="2022" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Resume */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Resume</CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.resumeUrl ? (
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Resume uploaded</span>
                </div>
              ) : null}
              <label className="flex items-center gap-3 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <div className="text-sm font-medium">{uploading ? "Uploading..." : "Upload PDF resume"}</div>
                  <div className="text-xs text-muted-foreground">PDF files only</div>
                </div>
                <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading} data-testid="input-resume" />
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending} data-testid="button-save-profile">
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
