import { Router } from "express";
import { db, interviewSchedulesTable, applicationsTable, jobsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/recruiter/interviews — all interviews created by this recruiter
router.get("/interviews", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const recruiterId = req.user!.id;

  const rows = await db
    .select({
      id: interviewSchedulesTable.id,
      applicationId: interviewSchedulesTable.applicationId,
      scheduledAt: interviewSchedulesTable.scheduledAt,
      location: interviewSchedulesTable.location,
      notes: interviewSchedulesTable.notes,
      status: interviewSchedulesTable.status,
      createdAt: interviewSchedulesTable.createdAt,
      candidateId: applicationsTable.candidateId,
      jobId: applicationsTable.jobId,
      candidateName: usersTable.name,
      jobTitle: jobsTable.title,
    })
    .from(interviewSchedulesTable)
    .innerJoin(applicationsTable, eq(applicationsTable.id, interviewSchedulesTable.applicationId))
    .innerJoin(usersTable, eq(usersTable.id, applicationsTable.candidateId))
    .innerJoin(jobsTable, eq(jobsTable.id, applicationsTable.jobId))
    .where(eq(interviewSchedulesTable.recruiterId, recruiterId))
    .orderBy(interviewSchedulesTable.scheduledAt);

  res.json(rows);
});

export default router;
