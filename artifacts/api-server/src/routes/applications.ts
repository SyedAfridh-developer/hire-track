import { Router } from "express";
import { db, applicationsTable, jobsTable, companiesTable, profilesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

async function buildApplicationResponse(app: typeof applicationsTable.$inferSelect) {
  // Build job
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

  // Build candidate profile
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, app.candidateId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, app.candidateId)).limit(1);
  const candidateResponse = profile && user
    ? {
        ...profile,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
      }
    : null;

  return {
    ...app,
    job: jobResponse,
    candidate: candidateResponse,
  };
}

// GET /api/jobs/:jobId/applications — recruiter views applicants
router.get("/jobs/:jobId/applications", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) {
    res.status(400).json({ message: "Invalid job ID" });
    return;
  }

  const apps = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.jobId, jobId));

  const result = await Promise.all(apps.map(buildApplicationResponse));
  res.json(result);
});

// POST /api/applications — candidate applies
router.post("/applications", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const { jobId, coverLetter, resumeUrl } = req.body;

  if (!jobId) {
    res.status(400).json({ message: "jobId required" });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job || !job.isActive) {
    res.status(404).json({ message: "Job not found or inactive" });
    return;
  }

  const [existing] = await db
    .select()
    .from(applicationsTable)
    .where(and(eq(applicationsTable.candidateId, req.user!.id), eq(applicationsTable.jobId, jobId)))
    .limit(1);

  if (existing) {
    res.status(400).json({ message: "Already applied to this job" });
    return;
  }

  const [app] = await db
    .insert(applicationsTable)
    .values({
      candidateId: req.user!.id,
      jobId,
      coverLetter: coverLetter || null,
      resumeUrl: resumeUrl || null,
    })
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
  if (isNaN(applicationId)) {
    res.status(400).json({ message: "Invalid application ID" });
    return;
  }

  const { status } = req.body;
  if (!["applied", "shortlisted", "rejected", "hired"].includes(status)) {
    res.status(400).json({ message: "Invalid status" });
    return;
  }

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, applicationId))
    .limit(1);

  if (!app) {
    res.status(404).json({ message: "Application not found" });
    return;
  }

  const [updated] = await db
    .update(applicationsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(applicationsTable.id, applicationId))
    .returning();

  res.json(await buildApplicationResponse(updated));
});

export default router;
