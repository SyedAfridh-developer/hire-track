import { Router } from "express";
import { db, jobAlertsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/alerts
router.get("/", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const alerts = await db
    .select()
    .from(jobAlertsTable)
    .where(eq(jobAlertsTable.userId, req.user!.id))
    .orderBy(jobAlertsTable.createdAt);

  res.json(alerts);
});

// POST /api/alerts
router.post("/", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const { keyword, location, jobType } = req.body;

  if (!keyword && !location && !jobType) {
    res.status(400).json({ message: "At least one filter (keyword, location, or job type) is required" });
    return;
  }

  const [alert] = await db
    .insert(jobAlertsTable)
    .values({
      userId: req.user!.id,
      keyword: keyword || null,
      location: location || null,
      jobType: jobType || null,
    })
    .returning();

  res.status(201).json(alert);
});

// DELETE /api/alerts/:alertId
router.delete("/:alertId", authenticate, requireRole("candidate"), async (req: AuthRequest, res) => {
  const alertId = parseInt(req.params.alertId);
  if (isNaN(alertId)) {
    res.status(400).json({ message: "Invalid alert ID" });
    return;
  }

  const [alert] = await db
    .select()
    .from(jobAlertsTable)
    .where(and(eq(jobAlertsTable.id, alertId), eq(jobAlertsTable.userId, req.user!.id)))
    .limit(1);

  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }

  await db.delete(jobAlertsTable).where(eq(jobAlertsTable.id, alertId));
  res.json({ message: "Alert deleted" });
});

export default router;
