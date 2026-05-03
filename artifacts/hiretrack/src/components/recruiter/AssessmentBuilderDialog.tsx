import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, CheckSquare, AlignLeft, ChevronDown, ChevronUp } from "lucide-react";

interface Question {
  id: string;
  type: "multiple_choice" | "text";
  question: string;
  options: string[];
  correctAnswer?: number;
}

function newQuestion(type: "multiple_choice" | "text"): Question {
  return {
    id: `q${Date.now()}`,
    type,
    question: "",
    options: type === "multiple_choice" ? ["", "", "", ""] : [],
    correctAnswer: type === "multiple_choice" ? 0 : undefined,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (template: { id: number; title: string }) => void;
}

export function AssessmentBuilderDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<Question[]>([newQuestion("multiple_choice")]);
  const [saving, setSaving] = useState(false);

  function addQuestion(type: "multiple_choice" | "text") {
    setQuestions((prev) => [...prev, newQuestion(type)]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, ...patch } : q));
  }

  function updateOption(qId: string, idx: number, value: string) {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== qId) return q;
      const options = [...q.options];
      options[idx] = value;
      return { ...q, options };
    }));
  }

  function moveQuestion(id: string, dir: -1 | 1) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx + dir < 0 || idx + dir >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  }

  async function save() {
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    for (const q of questions) {
      if (!q.question.trim()) { toast({ title: "All questions must have text", variant: "destructive" }); return; }
      if (q.type === "multiple_choice") {
        if (q.options.some((o) => !o.trim())) { toast({ title: "All options must be filled in", variant: "destructive" }); return; }
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          questions: questions.map(({ id, type, question, options, correctAnswer }) => ({
            id, type, question,
            ...(type === "multiple_choice" ? { options, correctAnswer } : {}),
          })),
          timeLimitMinutes: timeLimit ? Number(timeLimit) : undefined,
        }),
      });

      if (res.ok) {
        const template = await res.json();
        toast({ title: "Assessment created", description: `"${template.title}" is ready to send` });
        onCreated(template);
        onOpenChange(false);
        setTitle(""); setDescription(""); setTimeLimit(""); setQuestions([newQuestion("multiple_choice")]);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "Failed to create assessment", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  const mcCount = questions.filter((q) => q.type === "multiple_choice").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. React Skills Check" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time limit (minutes, optional)</Label>
              <Input type="number" min={1} placeholder="e.g. 20" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea placeholder="Instructions for the candidate…" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Questions ({questions.length}) · {mcCount} auto-scored
              </Label>
            </div>

            {questions.map((q, idx) => (
              <div key={q.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                    <button onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    <button onClick={() => moveQuestion(q.id, 1)} disabled={idx === questions.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${q.type === "multiple_choice" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {q.type === "multiple_choice" ? "Multiple choice" : "Text answer"}
                      </span>
                      <span className="text-xs text-muted-foreground">Q{idx + 1}</span>
                    </div>

                    <Input
                      placeholder={`Question ${idx + 1}…`}
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                    />

                    {q.type === "multiple_choice" && (
                      <div className="space-y-1.5 pl-1">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuestion(q.id, { correctAnswer: oi })}
                              className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${q.correctAnswer === oi ? "bg-green-500 border-green-500" : "border-muted-foreground/40 hover:border-green-400"}`}
                              title="Mark as correct answer"
                            />
                            <Input
                              placeholder={`Option ${oi + 1}`}
                              value={opt}
                              onChange={(e) => updateOption(q.id, oi, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground pl-6">● = correct answer (click circle to set)</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/60 hover:text-destructive shrink-0"
                    onClick={() => removeQuestion(q.id)}
                    disabled={questions.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add question buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => addQuestion("multiple_choice")}>
              <CheckSquare className="h-3.5 w-3.5" />
              Add multiple choice
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => addQuestion("text")}>
              <AlignLeft className="h-3.5 w-3.5" />
              Add text question
            </Button>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Creating…" : "Create assessment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
