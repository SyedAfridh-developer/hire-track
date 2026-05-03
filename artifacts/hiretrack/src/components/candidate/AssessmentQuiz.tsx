import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle, Clock, Star, AlignLeft, CheckSquare, AlertCircle } from "lucide-react";

interface Question {
  id: string;
  type: "multiple_choice" | "text";
  question: string;
  options?: string[];
  correctAnswer?: number;
}

interface AssessmentTemplate {
  id: number;
  title: string;
  description?: string | null;
  questions: Question[];
  timeLimitMinutes?: number | null;
}

interface Submission {
  id: number;
  status: "pending" | "submitted" | "scored";
  score: number | null;
  maxScore: number;
  submittedAt: string | null;
  answers: Array<{ questionId: string; answer: string | number }> | null;
}

interface AssessmentData {
  submission: Submission;
  assessment: AssessmentTemplate;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function ScoreBadge({ score, maxScore }: { score: number | null; maxScore: number }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full font-medium">
        <Clock className="h-3 w-3" /> Pending review
      </span>
    );
  }
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
  const color = pct >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : pct >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${color}`}>
      <Star className="h-3 w-3" /> {score}/{maxScore} ({pct}%)
    </span>
  );
}

interface Props {
  applicationId: number;
}

export function AssessmentQuiz({ applicationId }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/submission/by-application/${applicationId}`, { headers: authHeader() });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    if (!quizStarted || !data?.assessment?.timeLimitMinutes || data.submission.status !== "pending") return;
    setTimeLeft(data.assessment.timeLimitMinutes * 60);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quizStarted, data]);

  async function submit() {
    if (!data) return;
    const questions = data.assessment.questions;
    const unanswered = questions.filter((q) => !(q.id in answers));
    if (unanswered.length > 0) {
      toast({ title: `Please answer all questions (${unanswered.length} remaining)`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/submission/${data.submission.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => prev ? { ...prev, submission: updated } : null);
        toast({ title: "Assessment submitted!", description: "Your answers have been recorded." });
      } else {
        toast({ title: "Failed to submit", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (!data) return null;

  const { submission, assessment } = data;
  const questions = assessment.questions;
  const mcCount = questions.filter((q) => q.type === "multiple_choice").length;

  // Already submitted
  if (submission.status !== "pending") {
    return (
      <Card className="mt-3 border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-foreground">Assessment completed: {assessment.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <ScoreBadge score={submission.score} maxScore={submission.maxScore} />
                {submission.submittedAt && (
                  <span className="text-xs text-muted-foreground">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
              {submission.status === "submitted" && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Text answers are pending manual review by the recruiter.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending — show start prompt or the quiz
  if (!quizStarted) {
    return (
      <Card className="mt-3 border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ClipboardList className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">{assessment.title}</p>
              {assessment.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{assessment.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{mcCount} auto-scored</span>
                {questions.length - mcCount > 0 && (
                  <span className="flex items-center gap-1"><AlignLeft className="h-3 w-3" />{questions.length - mcCount} text</span>
                )}
                {assessment.timeLimitMinutes && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <Clock className="h-3 w-3" />{assessment.timeLimitMinutes} min time limit
                  </span>
                )}
              </div>
              <Button size="sm" className="mt-3" onClick={() => setQuizStarted(true)}>
                Start assessment →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quiz in progress
  return (
    <Card className="mt-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            {assessment.title}
          </CardTitle>
          {timeLeft !== null && (
            <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${timeLeft < 120 ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          )}
        </div>
        {assessment.description && (
          <p className="text-sm text-muted-foreground">{assessment.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>{q.question}
            </p>

            {q.type === "multiple_choice" && q.options ? (
              <div className="space-y-1.5 pl-1">
                {q.options.map((opt, oi) => {
                  const isSelected = answers[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${isSelected ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border hover:border-primary/40 text-muted-foreground"}`}
                    >
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Textarea
                placeholder="Your answer…"
                rows={3}
                value={String(answers[q.id] ?? "")}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="text-sm"
              />
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {Object.keys(answers).length}/{questions.length} answered
          </p>
          <Button onClick={submit} disabled={submitting || Object.keys(answers).length < questions.length}>
            {submitting ? "Submitting…" : "Submit assessment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
