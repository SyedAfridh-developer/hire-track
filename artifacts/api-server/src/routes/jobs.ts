import { Router } from "express";
import { db, jobsTable, companiesTable, applicationsTable, savedJobsTable, jobAlertsTable, notificationsTable } from "@workspace/db";
import { eq, and, ilike, sql, or, inArray } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

async function buildJobResponse(job: typeof jobsTable.$inferSelect) {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, job.companyId))
    .limit(1);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applicationsTable)
    .where(eq(applicationsTable.jobId, job.id));

  return {
    ...job,
    applicationCount: count || 0,
    company: company || { id: 0, recruiterId: 0, name: "Unknown", description: null, website: null, location: null, industry: null, size: null, logoUrl: null },
  };
}

// GET /api/jobs/saved — must be before /:jobId
router.get("/saved", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const rows = await db
    .select()
    .from(savedJobsTable)
    .where(eq(savedJobsTable.userId, req.user!.id));

  const jobIds = rows.map((r) => r.jobId);
  if (!jobIds.length) {
    res.json([]);
    return;
  }

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(inArray(jobsTable.id, jobIds));

  const result = await Promise.all(jobs.map(buildJobResponse));
  res.json(result);
});

// GET /api/jobs/featured
router.get("/featured", async (_req, res) => {
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.isActive, true))
    .orderBy(sql`${jobsTable.createdAt} DESC`)
    .limit(6);

  const result = await Promise.all(jobs.map(buildJobResponse));
  res.json(result);
});

// GET /api/jobs
router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;
  const keyword = req.query.keyword as string | undefined;
  const location = req.query.location as string | undefined;
  const skills = req.query.skills as string | undefined;
  const jobType = req.query.jobType as string | undefined;

  const conditions = [eq(jobsTable.isActive, true)];

  if (keyword) {
    conditions.push(
      or(
        ilike(jobsTable.title, `%${keyword}%`),
        ilike(jobsTable.description, `%${keyword}%`)
      ) as any
    );
  }

  if (location) {
    conditions.push(ilike(jobsTable.location, `%${location}%`));
  }

  if (jobType && ["full-time", "part-time", "contract", "internship", "remote"].includes(jobType)) {
    conditions.push(eq(jobsTable.jobType, jobType as any));
  }

  const whereClause = and(...conditions);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(jobsTable)
    .where(whereClause);

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(whereClause)
    .orderBy(sql`${jobsTable.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  // Filter by skills if provided
  let filtered = jobs;
  if (skills) {
    const skillList = skills.split(",").map((s) => s.trim().toLowerCase());
    filtered = jobs.filter((j) =>
      skillList.some((sk) => j.skills.some((js) => js.toLowerCase().includes(sk)))
    );
  }

  const result = await Promise.all(filtered.map(buildJobResponse));

  res.json({
    jobs: result,
    total: total || 0,
    page,
    limit,
    totalPages: Math.ceil((total || 0) / limit),
  });
});

// POST /api/jobs
router.post("/", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const { title, description, location, jobType, salaryMin, salaryMax, skills } = req.body;

  if (!title || !description || !location || !jobType || !skills) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.recruiterId, req.user!.id))
    .limit(1);

  if (!company) {
    res.status(400).json({ message: "Create a company profile first" });
    return;
  }

  const [job] = await db
    .insert(jobsTable)
    .values({
      recruiterId: req.user!.id,
      companyId: company.id,
      title,
      description,
      location,
      jobType,
      salaryMin: salaryMin || null,
      salaryMax: salaryMax || null,
      skills: Array.isArray(skills) ? skills : [skills],
    })
    .returning();

  // Fire job alert notifications asynchronously
  (async () => {
    try {
      const alerts = await db.select().from(jobAlertsTable);
      for (const alert of alerts) {
        const keywordMatch = !alert.keyword ||
          job.title.toLowerCase().includes(alert.keyword.toLowerCase()) ||
          job.description.toLowerCase().includes(alert.keyword.toLowerCase());
        const locationMatch = !alert.location ||
          job.location.toLowerCase().includes(alert.location.toLowerCase());
        const jobTypeMatch = !alert.jobType || job.jobType === alert.jobType;

        if (keywordMatch && locationMatch && jobTypeMatch) {
          await db.insert(notificationsTable).values({
            userId: alert.userId,
            type: "job_alert",
            title: "New job matching your alert",
            message: `"${job.title}" at ${company.name} matches your alert${alert.keyword ? ` for "${alert.keyword}"` : ""}.`,
            relatedJobId: job.id,
          });
        }
      }
    } catch (_) { /* non-critical */ }
  })();

  res.status(201).json(await buildJobResponse(job));
});

// POST /api/jobs/:jobId/save
router.post("/:jobId/save", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) { res.status(400).json({ message: "Invalid job ID" }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) { res.status(404).json({ message: "Job not found" }); return; }

  await db.insert(savedJobsTable).values({ userId: req.user!.id, jobId }).onConflictDoNothing();
  res.json({ message: "Job saved" });
});

// DELETE /api/jobs/:jobId/save
router.delete("/:jobId/save", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) { res.status(400).json({ message: "Invalid job ID" }); return; }

  await db
    .delete(savedJobsTable)
    .where(and(eq(savedJobsTable.userId, req.user!.id), eq(savedJobsTable.jobId, jobId)));
  res.json({ message: "Job unsaved" });
});

// GET /api/jobs/:jobId
router.get("/:jobId", async (req, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) {
    res.status(400).json({ message: "Invalid job ID" });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) {
    res.status(404).json({ message: "Job not found" });
    return;
  }

  res.json(await buildJobResponse(job));
});

// PUT /api/jobs/:jobId
router.put("/:jobId", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) {
    res.status(400).json({ message: "Invalid job ID" });
    return;
  }

  const [job] = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.recruiterId, req.user!.id)))
    .limit(1);

  if (!job) {
    res.status(404).json({ message: "Job not found or not authorized" });
    return;
  }

  const { title, description, location, jobType, salaryMin, salaryMax, skills } = req.body;

  const [updated] = await db
    .update(jobsTable)
    .set({
      title: title ?? job.title,
      description: description ?? job.description,
      location: location ?? job.location,
      jobType: jobType ?? job.jobType,
      salaryMin: salaryMin !== undefined ? salaryMin : job.salaryMin,
      salaryMax: salaryMax !== undefined ? salaryMax : job.salaryMax,
      skills: skills ?? job.skills,
    })
    .where(eq(jobsTable.id, jobId))
    .returning();

  res.json(await buildJobResponse(updated));
});

// DELETE /api/jobs/:jobId
router.delete("/:jobId", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) {
    res.status(400).json({ message: "Invalid job ID" });
    return;
  }

  const [job] = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.recruiterId, req.user!.id)))
    .limit(1);

  if (!job) {
    res.status(404).json({ message: "Job not found or not authorized" });
    return;
  }

  await db.delete(jobsTable).where(eq(jobsTable.id, jobId));
  res.json({ message: "Job deleted" });
});

export default router;
