import { Router } from "express";
import { db, jobsTable, applicationsTable, companiesTable, profilesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/dashboard/recruiter
router.get("/recruiter", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const recruiterId = req.user!.id;

  const [{ totalJobs }] = await db
    .select({ totalJobs: sql<number>`count(*)::int` })
    .from(jobsTable)
    .where(eq(jobsTable.recruiterId, recruiterId));

  const [{ activeJobs }] = await db
    .select({ activeJobs: sql<number>`count(*)::int` })
    .from(jobsTable)
    .where(and(eq(jobsTable.recruiterId, recruiterId), eq(jobsTable.isActive, true)));

  // All job IDs for this recruiter
  const recruiterJobs = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(eq(jobsTable.recruiterId, recruiterId));

  const jobIds = recruiterJobs.map((j) => j.id);

  if (jobIds.length === 0) {
    res.json({
      totalJobs: totalJobs || 0,
      activeJobs: activeJobs || 0,
      totalApplications: 0,
      applicationsByStatus: { applied: 0, shortlisted: 0, rejected: 0, hired: 0 },
      recentApplications: [],
      topJobs: [],
    });
    return;
  }

  const allApplications = await db
    .select()
    .from(applicationsTable)
    .where(sql`${applicationsTable.jobId} = ANY(${sql.raw(`ARRAY[${jobIds.join(",")}]`)})`)
    .orderBy(sql`${applicationsTable.createdAt} DESC`);

  const statusCounts = { applied: 0, shortlisted: 0, rejected: 0, hired: 0 };
  for (const app of allApplications) {
    statusCounts[app.status as keyof typeof statusCounts]++;
  }

  // Build recent applications (up to 5)
  const recentRaw = allApplications.slice(0, 5);
  const recentApplications = await Promise.all(
    recentRaw.map(async (app) => {
      const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
      const [company] = job
        ? await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId)).limit(1)
        : [null];
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, app.candidateId)).limit(1);
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, app.candidateId)).limit(1);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applicationsTable)
        .where(eq(applicationsTable.jobId, app.jobId));
      return {
        ...app,
        job: job ? { ...job, applicationCount: count || 0, company: company || { id: 0, recruiterId: 0, name: "Unknown", description: null, website: null, location: null, industry: null, size: null, logoUrl: null } } : null,
        candidate: profile && user ? { ...profile, user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } } : null,
      };
    })
  );

  // Top jobs by application count
  const jobsWithCounts = await Promise.all(
    recruiterJobs.map(async (j) => {
      const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, j.id)).limit(1);
      const [company] = job
        ? await db.select().from(companiesTable).where(eq(companiesTable.id, job!.companyId)).limit(1)
        : [null];
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applicationsTable)
        .where(eq(applicationsTable.jobId, j.id));
      return job ? { ...job, applicationCount: count || 0, company: company || { id: 0, recruiterId: 0, name: "Unknown", description: null, website: null, location: null, industry: null, size: null, logoUrl: null } } : null;
    })
  );

  const topJobs = jobsWithCounts
    .filter(Boolean)
    .sort((a, b) => (b!.applicationCount || 0) - (a!.applicationCount || 0))
    .slice(0, 5);

  res.json({
    totalJobs: totalJobs || 0,
    activeJobs: activeJobs || 0,
    totalApplications: allApplications.length,
    applicationsByStatus: statusCounts,
    recentApplications,
    topJobs,
  });
});

// GET /api/dashboard/candidate
router.get("/candidate", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const candidateId = req.user!.id;

  const apps = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.candidateId, candidateId))
    .orderBy(sql`${applicationsTable.createdAt} DESC`);

  const counts = { applied: 0, shortlisted: 0, rejected: 0, hired: 0 };
  for (const app of apps) {
    counts[app.status as keyof typeof counts]++;
  }

  const recentRaw = apps.slice(0, 5);
  const recentApplications = await Promise.all(
    recentRaw.map(async (app) => {
      const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
      const [company] = job
        ? await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId)).limit(1)
        : [null];
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, candidateId)).limit(1);
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, candidateId)).limit(1);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applicationsTable)
        .where(eq(applicationsTable.jobId, app.jobId));
      return {
        ...app,
        job: job ? { ...job, applicationCount: count || 0, company: company || { id: 0, recruiterId: 0, name: "Unknown", description: null, website: null, location: null, industry: null, size: null, logoUrl: null } } : null,
        candidate: profile && user ? { ...profile, user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } } : null,
      };
    })
  );

  res.json({
    totalApplications: apps.length,
    ...counts,
    recentApplications,
  });
});

export default router;
