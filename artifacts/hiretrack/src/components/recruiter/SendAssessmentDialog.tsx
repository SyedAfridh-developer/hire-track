import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle, Clock, AlignLeft, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AssessmentTemplate {
  id: number;
  title: string;
  description?: string | null;
  questions: Array<{ id: string; type: string; question: string }>;
  timeLimitMinutes?: number | null;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: number;
  candidateName: string;
}

export function SendAssessmentDialog({ open, onOpenChange, applicationId, candidateName }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/assessments", { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  async function send() {
    if (!selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/assessments/${selected}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ applicationId }),
      });
      if (res.ok) {
        toast({ title: "Assessment sent!", description: `${candidateName} will see it on their applications page.` });
        onOpenChange(false);
        setSelected(null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "Failed to send assessment", variant: "destructive" });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Send Assessment to {candidateName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">
          Select a quiz template to send. The candidate will be notified and can complete it from their Applications page.
        </p>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-25" />
              <p>No assessments yet. Create one from the Assessments page first.</p>
            </div>
          ) : (
            templates.map((t) => {
              const mcCount = t.questions.filter((q) => q.type === "multiple_choice").length;
              const textCount = t.questions.length - mcCount;
              const isSelected = selected === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(isSelected ? null : t.id)}
                  className={`w-full text-left border rounded-lg p-3 transition-all ${isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{t.title}</span>
                        {isSelected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{t.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {mcCount > 0 && (
                          <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{mcCount} auto-scored</span>
                        )}
                        {textCount > 0 && (
                          <span className="flex items-center gap-1"><AlignLeft className="h-3 w-3" />{textCount} text</span>
                        )}
                        {t.timeLimitMinutes && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.timeLimitMinutes} min limit</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{t.questions.length}Q</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={!selected || sending}>
            {sending ? "Sending…" : "Send assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
