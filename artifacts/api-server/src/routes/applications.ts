import { Router } from "express";
import { db, applicationsTable, jobsTable, companiesTable, profilesTable, usersTable, notificationsTable, applicantNotesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

async function buildApplicationResponse(app: typeof applicationsTable.$inferSelect) {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
  const [company] = job
    ? await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId)).limit(1)
    : [null];
  const [{ count: appCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applicationsTable)
    .where(eq(applicationsTable.jobId, app.jobId));

  const jobResponse = job
    ? {
        ...job,
        applicationCount: appCount || 0,
        company: company || { id: 0, recruiterId: 0, name: "Unknown", description: null, website: null, location: null, industry: null, size: null, logoUrl: null },
      }
    : null;

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, app.candidateId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, app.candidateId)).limit(1);
  const candidateResponse = profile && user
    ? {
        ...profile,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
      }
    : null;

  return { ...app, job: jobResponse, candidate: candidateResponse };
}

const STATUS_MESSAGES: Record<string, { title: string; message: (jobTitle: string) => string }> = {
  shortlisted: {
    title: "You've been shortlisted!",
    message: (jobTitle) => `Great news! You've been shortlisted for the ${jobTitle} position. The recruiter will be in touch soon.`,
  },
  hired: {
    title: "Congratulations — you're hired!",
    message: (jobTitle) => `You've been selected for the ${jobTitle} role. Welcome aboard!`,
  },
  rejected: {
    title: "Application update",
    message: (jobTitle) => `Your application for ${jobTitle} was not selected this time. Keep applying!`,
  },
  applied: {
    title: "Application status updated",
    message: (jobTitle) => `Your application status for ${jobTitle} has been updated to: Applied.`,
  },
};

async function createStatusNotification(candidateId: number, jobTitle: string, newStatus: string, applicationId: number, jobId: number) {
  const cfg = STATUS_MESSAGES[newStatus];
  if (!cfg) return;
  await db.insert(notificationsTable).values({
    userId: candidateId,
    type: "status_change",
    title: cfg.title,
    message: cfg.message(jobTitle),
    relatedApplicationId: applicationId,
    relatedJobId: jobId,
  });
}

// GET /api/jobs/:jobId/applications — recruiter views applicants
router.get("/jobs/:jobId/applications", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) { res.status(400).json({ message: "Invalid job ID" }); return; }

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.jobId, jobId));
  const result = await Promise.all(apps.map(buildApplicationResponse));
  res.json(result);
});

// POST /api/applications — candidate applies
router.post("/applications", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const { jobId, coverLetter, resumeUrl } = req.body;
  if (!jobId) { res.status(400).json({ message: "jobId required" }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job || !job.isActive) { res.status(404).json({ message: "Job not found or inactive" }); return; }

  const [existing] = await db
    .select()
    .from(applicationsTable)
    .where(and(eq(applicationsTable.candidateId, req.user!.id), eq(applicationsTable.jobId, jobId)))
    .limit(1);

  if (existing) { res.status(400).json({ message: "Already applied to this job" }); return; }

  const [app] = await db
    .insert(applicationsTable)
    .values({ candidateId: req.user!.id, jobId, coverLetter: coverLetter || null, resumeUrl: resumeUrl || null })
    .returning();

  res.status(201).json(await buildApplicationResponse(app));
});

// GET /api/applications — candidate views own applications
router.get("/applications", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const apps = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.candidateId, req.user!.id))
    .orderBy(sql`${applicationsTable.createdAt} DESC`);

  const result = await Promise.all(apps.map(buildApplicationResponse));
  res.json(result);
});

// PATCH /api/applications/:applicationId/status — recruiter updates status
router.patch("/applications/:applicationId/status", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) { res.status(400).json({ message: "Invalid application ID" }); return; }

  const { status } = req.body;
  if (!["applied", "shortlisted", "rejected", "hired"].includes(status)) {
    res.status(400).json({ message: "Invalid status" }); return;
  }

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, applicationId))
    .limit(1);

  if (!app) { res.status(404).json({ message: "Application not found" }); return; }

  const [updated] = await db
    .update(applicationsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(applicationsTable.id, applicationId))
    .returning();

  // Notify candidate of status change (only if status actually changed)
  if (app.status !== status) {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
    if (job) {
      await createStatusNotification(app.candidateId, job.title, status, applicationId, app.jobId).catch(() => {});
    }
  }

  res.json(await buildApplicationResponse(updated));
});

// GET /api/applications/:applicationId/notes — recruiter only
router.get("/:applicationId/notes", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const applicationId = Number(req.params["applicationId"]);
  const recruiterId = req.user!.id;
  const notes = await db
    .select()
    .from(applicantNotesTable)
    .where(and(eq(applicantNotesTable.applicationId, applicationId), eq(applicantNotesTable.recruiterId, recruiterId)))
    .orderBy(applicantNotesTable.createdAt);
  res.json(notes);
});

// POST /api/applications/:applicationId/notes
router.post("/:applicationId/notes", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const applicationId = Number(req.params["applicationId"]);
  const recruiterId = req.user!.id;
  const { body } = req.body as { body: string };
  if (!body?.trim()) { res.status(400).json({ message: "Note body is required" }); return; }
  const [note] = await db
    .insert(applicantNotesTable)
    .values({ applicationId, recruiterId, body: body.trim() })
    .returning();
  res.status(201).json(note);
});

// DELETE /api/applications/:applicationId/notes/:noteId
router.delete("/:applicationId/notes/:noteId", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const noteId = Number(req.params["noteId"]);
  const recruiterId = req.user!.id;
  const [note] = await db.select().from(applicantNotesTable).where(eq(applicantNotesTable.id, noteId)).limit(1);
  if (!note || note.recruiterId !== recruiterId) { res.status(404).json({ message: "Note not found" }); return; }
  await db.delete(applicantNotesTable).where(eq(applicantNotesTable.id, noteId));
  res.json({ message: "Note deleted" });
});

export default router;
