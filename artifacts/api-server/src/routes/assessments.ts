import { Router } from "express";
import { db, assessmentsTable, assessmentSubmissionsTable, applicationsTable, jobsTable, notificationsTable, usersTable } from "@workspace/db";
import type { AssessmentQuestion, AssessmentAnswer } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// ── Recruiter: list own templates ─────────────────────────────────────────────

router.get("/", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const templates = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.recruiterId, req.user!.id))
    .orderBy(assessmentsTable.createdAt);
  res.json(templates);
});

// ── Recruiter: create template ────────────────────────────────────────────────

router.post("/", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const { title, description, questions, timeLimitMinutes } = req.body as {
    title: string;
    description?: string;
    questions: AssessmentQuestion[];
    timeLimitMinutes?: number;
  };

  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }
  if (!Array.isArray(questions) || questions.length === 0) { res.status(400).json({ error: "At least one question required" }); return; }

  const [template] = await db
    .insert(assessmentsTable)
    .values({
      recruiterId: req.user!.id,
      title: title.trim(),
      description: description?.trim() || null,
      questions,
      timeLimitMinutes: timeLimitMinutes || null,
    })
    .returning();

  res.status(201).json(template);
});

// ── Recruiter: delete template ────────────────────────────────────────────────

router.delete("/:id", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  await db.delete(assessmentsTable).where(
    and(eq(assessmentsTable.id, id), eq(assessmentsTable.recruiterId, req.user!.id))
  );
  res.json({ success: true });
});

// ── Recruiter: send assessment to a candidate ─────────────────────────────────

router.post("/:id/send", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const assessmentId = Number(req.params["id"]);
  const { applicationId } = req.body as { applicationId: number };

  if (!applicationId) { res.status(400).json({ error: "applicationId required" }); return; }

  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(and(eq(assessmentsTable.id, assessmentId), eq(assessmentsTable.recruiterId, req.user!.id)))
    .limit(1);
  if (!assessment) { res.status(404).json({ error: "Assessment not found" }); return; }

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, applicationId))
    .limit(1);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  // Check if already sent
  const [existing] = await db
    .select({ id: assessmentSubmissionsTable.id })
    .from(assessmentSubmissionsTable)
    .where(
      and(
        eq(assessmentSubmissionsTable.assessmentId, assessmentId),
        eq(assessmentSubmissionsTable.applicationId, applicationId),
      )
    )
    .limit(1);
  if (existing) { res.status(409).json({ error: "Assessment already sent to this candidate" }); return; }

  const maxScore = (assessment.questions as AssessmentQuestion[]).filter(
    (q) => q.type === "multiple_choice"
  ).length;

  const [submission] = await db
    .insert(assessmentSubmissionsTable)
    .values({
      assessmentId,
      applicationId,
      candidateId: app.candidateId,
      maxScore,
    })
    .returning();

  // Notify the candidate
  const [recruiter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  await db.insert(notificationsTable).values({
    userId: app.candidateId,
    type: "assessment_sent",
    title: "Skills assessment waiting for you",
    message: `${recruiter?.name ?? "A recruiter"} sent you a skills assessment: "${assessment.title}". Complete it from your Applications page.`,
    relatedApplicationId: applicationId,
  });

  res.status(201).json({ submission, assessment });
});

// ── Recruiter: get all submissions for their jobs ─────────────────────────────

router.get("/submissions", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const recruiterJobs = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(eq(jobsTable.recruiterId, req.user!.id));

  const jobIds = recruiterJobs.map((j) => j.id);
  if (!jobIds.length) { res.json([]); return; }

  const apps = await db
    .select({ id: applicationsTable.id })
    .from(applicationsTable)
    .where(inArray(applicationsTable.jobId, jobIds));

  const appIds = apps.map((a) => a.id);
  if (!appIds.length) { res.json([]); return; }

  const submissions = await db
    .select()
    .from(assessmentSubmissionsTable)
    .where(inArray(assessmentSubmissionsTable.applicationId, appIds));

  res.json(submissions);
});

// ── Shared: get submission for an application ─────────────────────────────────

router.get("/submission/by-application/:applicationId", authenticate, async (req: AuthRequest, res) => {
  const applicationId = Number(req.params["applicationId"]);

  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, applicationId)).limit(1);
  if (!app) { res.status(404).json({ error: "Not found" }); return; }

  // Candidate can only see their own; recruiter can see any for their jobs
  if (req.user!.role === "candidate" && app.candidateId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [submission] = await db
    .select()
    .from(assessmentSubmissionsTable)
    .where(eq(assessmentSubmissionsTable.applicationId, applicationId))
    .limit(1);

  if (!submission) { res.json(null); return; }

  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.id, submission.assessmentId))
    .limit(1);

  res.json({ submission, assessment });
});

// ── Candidate: submit answers ─────────────────────────────────────────────────

router.post("/submission/:id/submit", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const submissionId = Number(req.params["id"]);
  const { answers } = req.body as { answers: AssessmentAnswer[] };

  const [submission] = await db
    .select()
    .from(assessmentSubmissionsTable)
    .where(
      and(
        eq(assessmentSubmissionsTable.id, submissionId),
        eq(assessmentSubmissionsTable.candidateId, req.user!.id),
      )
    )
    .limit(1);

  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }
  if (submission.status !== "pending") { res.status(409).json({ error: "Already submitted" }); return; }

  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.id, submission.assessmentId))
    .limit(1);

  // Auto-score multiple choice questions
  const questions = assessment.questions as AssessmentQuestion[];
  let score = 0;
  const mcQuestions = questions.filter((q) => q.type === "multiple_choice");
  for (const q of mcQuestions) {
    const answer = answers.find((a) => a.questionId === q.id);
    if (answer !== undefined && Number(answer.answer) === q.correctAnswer) {
      score++;
    }
  }

  const hasTextQuestions = questions.some((q) => q.type === "text");
  const newStatus = hasTextQuestions ? "submitted" : "scored";

  const [updated] = await db
    .update(assessmentSubmissionsTable)
    .set({
      answers,
      score,
      status: newStatus,
      submittedAt: new Date(),
    })
    .where(eq(assessmentSubmissionsTable.id, submissionId))
    .returning();

  res.json(updated);
});

export default router;
