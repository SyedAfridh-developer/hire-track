import { Router } from "express";
import { db, referralLinksTable, applicationsTable, jobsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Recruiter: create referral link ──────────────────────────────────────────

router.post("/links", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const { jobId, label } = req.body as { jobId?: number; label?: string };
  if (!jobId) { res.status(400).json({ error: "jobId required" }); return; }

  const [job] = await db.select().from(jobsTable).where(
    and(eq(jobsTable.id, jobId), eq(jobsTable.recruiterId, req.user!.id))
  ).limit(1);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const [existing] = await db.select({ id: referralLinksTable.id }).from(referralLinksTable).where(eq(referralLinksTable.code, code)).limit(1);
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  const [link] = await db.insert(referralLinksTable).values({
    code: code!,
    jobId,
    recruiterId: req.user!.id,
    label: label?.trim() || "Direct",
  }).returning();

  res.status(201).json(link);
});

// ── Recruiter: list referral links for a job ──────────────────────────────────

router.get("/links", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const jobId = Number(req.query["jobId"]);
  if (Number.isNaN(jobId)) { res.status(400).json({ error: "jobId required" }); return; }

  const links = await db.select().from(referralLinksTable).where(
    and(eq(referralLinksTable.jobId, jobId), eq(referralLinksTable.recruiterId, req.user!.id))
  ).orderBy(desc(referralLinksTable.createdAt));

  res.json(links);
});

// ── Recruiter: delete referral link ──────────────────────────────────────────

router.delete("/links/:id", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(referralLinksTable).where(
    and(eq(referralLinksTable.id, id), eq(referralLinksTable.recruiterId, req.user!.id))
  );
  res.json({ success: true });
});

// ── Recruiter: leaderboard across all jobs ────────────────────────────────────

router.get("/leaderboard", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const links = await db
    .select({
      id: referralLinksTable.id,
      code: referralLinksTable.code,
      label: referralLinksTable.label,
      clickCount: referralLinksTable.clickCount,
      convertCount: referralLinksTable.convertCount,
      createdAt: referralLinksTable.createdAt,
      jobTitle: jobsTable.title,
      jobId: jobsTable.id,
    })
    .from(referralLinksTable)
    .innerJoin(jobsTable, eq(referralLinksTable.jobId, jobsTable.id))
    .where(eq(referralLinksTable.recruiterId, req.user!.id))
    .orderBy(desc(referralLinksTable.convertCount), desc(referralLinksTable.clickCount))
    .limit(15);

  res.json(links);
});

// ── Public: track a click ─────────────────────────────────────────────────────

router.get("/track/:code", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const code = req.params["code"];

  const [link] = await db.select().from(referralLinksTable).where(eq(referralLinksTable.code, code)).limit(1);
  if (!link) { res.status(404).json({ error: "Referral link not found" }); return; }

  await db.update(referralLinksTable)
    .set({ clickCount: sql`${referralLinksTable.clickCount} + 1` })
    .where(eq(referralLinksTable.id, link.id));

  res.json({ jobId: link.jobId, label: link.label });
});

// ── Candidate: convert (called after successful application) ──────────────────

router.post("/convert/:code", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const code = req.params["code"];

  const [link] = await db.select().from(referralLinksTable).where(eq(referralLinksTable.code, code)).limit(1);
  if (!link) { res.status(404).json({ error: "Referral link not found" }); return; }

  const [app] = await db.select().from(applicationsTable).where(
    and(
      eq(applicationsTable.candidateId, req.user!.id),
      eq(applicationsTable.jobId, link.jobId),
    )
  ).limit(1);

  if (!app) { res.status(404).json({ error: "No application found for this job" }); return; }

  if (app.referralLinkId) { res.json({ success: true, already: true }); return; }

  await Promise.all([
    db.update(applicationsTable)
      .set({ referralLinkId: link.id })
      .where(eq(applicationsTable.id, app.id)),
    db.update(referralLinksTable)
      .set({ convertCount: sql`${referralLinksTable.convertCount} + 1` })
      .where(eq(referralLinksTable.id, link.id)),
  ]);

  res.json({ success: true });
});

export default router;
