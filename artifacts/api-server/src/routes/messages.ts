import { Router } from "express";
import { db, messagesTable, applicationsTable, usersTable, jobsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/messages/unread-count — must be declared BEFORE /:applicationId
router.get("/unread-count", authenticate, async (req: AuthRequest, res) => {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(and(eq(messagesTable.recipientId, req.user!.id), eq(messagesTable.isRead, false)));

  res.json({ unreadCount: count ?? 0 });
});

async function getThread(applicationId: number, userId: number) {
  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, applicationId))
    .limit(1);
  if (!app) return null;

  // Only the candidate or the recruiter of the job can access the thread
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
  if (!job) return null;

  const isCandidateOfApp = app.candidateId === userId;
  const isRecruiterOfJob = job.recruiterId === userId;
  if (!isCandidateOfApp && !isRecruiterOfJob) return null;

  return { app, job };
}

// GET /api/messages/:applicationId
router.get("/:applicationId", authenticate, async (req: AuthRequest, res) => {
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) { res.status(400).json({ message: "Invalid application ID" }); return; }

  const ctx = await getThread(applicationId, req.user!.id);
  if (!ctx) { res.status(404).json({ message: "Thread not found or access denied" }); return; }

  const { app, job } = ctx;
  const otherPartyId = req.user!.id === app.candidateId ? job.recruiterId : app.candidateId;

  const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherPartyId)).limit(1);

  const rawMessages = await db
    .select({
      id: messagesTable.id,
      applicationId: messagesTable.applicationId,
      senderId: messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      body: messagesTable.body,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
      senderName: usersTable.name,
      senderRole: usersTable.role,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(eq(messagesTable.applicationId, applicationId))
    .orderBy(messagesTable.createdAt);

  const unreadCount = rawMessages.filter(
    (m) => !m.isRead && m.recipientId === req.user!.id
  ).length;

  res.json({
    messages: rawMessages,
    unreadCount,
    otherPartyName: otherUser?.name ?? "Unknown",
    otherPartyRole: otherUser?.role ?? "unknown",
    jobTitle: job.title,
  });
});

// POST /api/messages/:applicationId
router.post("/:applicationId", authenticate, async (req: AuthRequest, res) => {
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) { res.status(400).json({ message: "Invalid application ID" }); return; }

  const { body } = req.body;
  if (!body || typeof body !== "string" || !body.trim()) {
    res.status(400).json({ message: "Message body is required" }); return;
  }

  const ctx = await getThread(applicationId, req.user!.id);
  if (!ctx) { res.status(404).json({ message: "Thread not found or access denied" }); return; }

  const { app, job } = ctx;
  const recipientId = req.user!.id === app.candidateId ? job.recruiterId : app.candidateId;

  const [inserted] = await db
    .insert(messagesTable)
    .values({
      applicationId,
      senderId: req.user!.id,
      recipientId,
      body: body.trim(),
    })
    .returning();

  // Create in-app notification for recipient
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  await db.insert(notificationsTable).values({
    userId: recipientId,
    type: "new_application",
    title: `New message from ${sender?.name ?? "someone"}`,
    message: `Re: ${job.title} — "${body.trim().slice(0, 80)}${body.trim().length > 80 ? "…" : ""}"`,
    relatedApplicationId: applicationId,
    relatedJobId: job.id,
  }).catch(() => {});

  const [withSender] = await db
    .select({
      id: messagesTable.id,
      applicationId: messagesTable.applicationId,
      senderId: messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      body: messagesTable.body,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
      senderName: usersTable.name,
      senderRole: usersTable.role,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(eq(messagesTable.id, inserted.id));

  res.status(201).json(withSender);
});

// PATCH /api/messages/:applicationId/read
router.patch("/:applicationId/read", authenticate, async (req: AuthRequest, res) => {
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) { res.status(400).json({ message: "Invalid application ID" }); return; }

  const ctx = await getThread(applicationId, req.user!.id);
  if (!ctx) { res.status(404).json({ message: "Thread not found or access denied" }); return; }

  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.applicationId, applicationId),
        eq(messagesTable.recipientId, req.user!.id),
        eq(messagesTable.isRead, false)
      )
    );

  res.json({ message: "Thread marked as read" });
});

export default router;
