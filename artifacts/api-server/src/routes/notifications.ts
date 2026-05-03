import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/notifications
router.get("/", authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.json({ notifications, unreadCount });
});

// POST /api/notifications/read-all
router.post("/read-all", authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ message: "All notifications marked as read" });
});

// PATCH /api/notifications/:notificationId/read
router.patch("/:notificationId/read", authenticate, async (req: AuthRequest, res) => {
  const notificationId = parseInt(req.params.notificationId);
  if (isNaN(notificationId)) {
    res.status(400).json({ message: "Invalid notification ID" });
    return;
  }

  const [notification] = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, req.user!.id)))
    .limit(1);

  if (!notification) {
    res.status(404).json({ message: "Notification not found" });
    return;
  }

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, notificationId))
    .returning();

  res.json(updated);
});

export default router;
