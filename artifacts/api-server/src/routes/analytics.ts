import { Router } from "express";
import { db, jobsTable, companiesTable, applicationsTable } from "@workspace/db";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/analytics/recruiter
router.get("/recruiter", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const recruiterId = req.user!.id;

  // Get all jobs for this recruiter (via their company)
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.recruiterId, recruiterId))
    .limit(1);

  if (!company) {
    return res.json({
      totalJobs: 0,
      totalApplications: 0,
      activeJobs: 0,
      hiredCount: 0,
      applicationsOverTime: [],
      statusBreakdown: [],
      topJobs: [],
    });
  }

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.companyId, company.id));

  const jobIds = jobs.map((j) => j.id);

  if (!jobIds.length) {
    return res.json({
      totalJobs: 0,
      totalApplications: 0,
      activeJobs: 0,
      hiredCount: 0,
      applicationsOverTime: [],
      statusBreakdown: [],
      topJobs: [],
    });
  }

  // All applications for this recruiter's jobs
  const applications = await db
    .select()
    .from(applicationsTable)
    .where(
      sql`${applicationsTable.jobId} = ANY(ARRAY[${sql.join(jobIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
    );

  const totalApplications = applications.length;
  const activeJobs = jobs.filter((j) => j.status === "open").length;
  const hiredCount = applications.filter((a) => a.status === "hired").length;

  // Applications over the last 30 days grouped by day
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyMap = new Map<string, number>();
  // Pre-fill all 30 days with 0 so the chart has no gaps
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  for (const app of applications) {
    const key = new Date(app.createdAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  }
  const applicationsOverTime = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  // Status breakdown
  const statusMap = new Map<string, number>();
  for (const app of applications) {
    statusMap.set(app.status, (statusMap.get(app.status) ?? 0) + 1);
  }
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  // Top 5 jobs by applicant count
  const jobCountMap = new Map<number, number>();
  for (const app of applications) {
    jobCountMap.set(app.jobId, (jobCountMap.get(app.jobId) ?? 0) + 1);
  }
  const topJobs = jobs
    .map((j) => ({ jobId: j.id, title: j.title, applicantCount: jobCountMap.get(j.id) ?? 0 }))
    .sort((a, b) => b.applicantCount - a.applicantCount)
    .slice(0, 5);

  return res.json({
    totalJobs: jobs.length,
    totalApplications,
    activeJobs,
    hiredCount,
    applicationsOverTime,
    statusBreakdown,
    topJobs,
  });
});

export default router;
