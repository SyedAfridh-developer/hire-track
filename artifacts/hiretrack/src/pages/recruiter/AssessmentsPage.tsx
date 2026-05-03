import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AssessmentBuilderDialog } from "@/components/recruiter/AssessmentBuilderDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ClipboardList, Plus, Trash2, CheckSquare, AlignLeft, Clock, Send } from "lucide-react";

interface Assessment {
  id: number;
  title: string;
  description?: string | null;
  questions: Array<{ id: string; type: string; question: string }>;
  timeLimitMinutes?: number | null;
  createdAt: string;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AssessmentsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/assessments", { headers: authHeader() });
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function deleteTemplate(id: number) {
    const res = await fetch(`/api/assessments/${id}`, { method: "DELETE", headers: authHeader() });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Assessment deleted" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Skill Assessments</h1>
            <p className="text-sm text-muted-foreground">Create quiz templates to send to shortlisted candidates</p>
          </div>
        </div>
        <Button className="gap-1.5" onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4" />
          New assessment
        </Button>
      </div>

      {/* Info card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex gap-3">
          <Send className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">How it works</p>
            <p className="text-muted-foreground mt-0.5">
              Build a quiz template here, then send it to any candidate from the <strong>Applicants</strong> page using the "Send Quiz" button.
              Multiple-choice questions are automatically scored. Text answers are marked as pending review.
              Scores appear on each applicant's card so you can rank candidates instantly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Templates list */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-25" />
            <h3 className="text-base font-medium text-foreground mb-1">No assessments yet</h3>
            <p className="text-sm mb-5">Create your first assessment to start screening candidates.</p>
            <Button onClick={() => setBuilderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Create assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map((t) => {
            const mcCount = t.questions.filter((q) => q.type === "multiple_choice").length;
            const textCount = t.questions.length - mcCount;
            return (
              <Card key={t.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold">{t.title}</CardTitle>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{t.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the assessment template. Already-sent quizzes will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTemplate(t.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {mcCount > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        <CheckSquare className="h-3 w-3" />{mcCount} auto-scored
                      </span>
                    )}
                    {textCount > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        <AlignLeft className="h-3 w-3" />{textCount} text
                      </span>
                    )}
                    {t.timeLimitMinutes && (
                      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />{t.timeLimitMinutes} min
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AssessmentBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onCreated={(t) => setTemplates((prev) => [{ ...t, questions: [], createdAt: new Date().toISOString() } as Assessment, ...prev])}
      />
    </div>
  );
}
