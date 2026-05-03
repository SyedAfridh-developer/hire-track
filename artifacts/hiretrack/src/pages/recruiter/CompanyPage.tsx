import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetMyCompany, getGetMyCompanyQueryKey, useUpdateCompany } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Building2, Globe, MapPin, Users, Layers } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Company name required"),
  description: z.string().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  location: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CompanyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCompany = useUpdateCompany();

  const { data: company, isLoading } = useGetMyCompany({
    query: { queryKey: getGetMyCompanyQueryKey() },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", website: "", location: "", industry: "", size: "" },
    values: company ? {
      name: company.name || "",
      description: company.description || "",
      website: company.website || "",
      location: company.location || "",
      industry: company.industry || "",
      size: company.size || "",
    } : undefined,
  });

  async function onSubmit(values: FormData) {
    updateCompany.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyCompanyQueryKey() });
          toast({ title: "Company profile updated!" });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
          <p className="text-muted-foreground text-sm">This information appears on your job listings</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Company Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Acme Corp" data-testid="input-company-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>About the Company</FormLabel>
                  <FormControl><Textarea placeholder="What does your company do?" rows={4} data-testid="input-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website</FormLabel>
                    <FormControl><Input placeholder="https://yourcompany.com" data-testid="input-website" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Headquarters</FormLabel>
                    <FormControl><Input placeholder="San Francisco, CA" data-testid="input-location" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />Industry</FormLabel>
                    <FormControl><Input placeholder="Technology, Finance, Healthcare..." data-testid="input-industry" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="size" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Company Size</FormLabel>
                    <FormControl><Input placeholder="e.g. 51-200" data-testid="input-size" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={updateCompany.isPending} data-testid="button-save-company">
                  {updateCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
