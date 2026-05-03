import { Router } from "express";
import { db, digestSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { sendDigestForRecruiter } from "../services/digest";

const router = Router();

// GET /api/recruiter/digest-settings
router.get("/digest-settings", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const recruiterId = req.user!.id;
  const [settings] = await db.select().from(digestSettingsTable).where(eq(digestSettingsTable.recruiterId, recruiterId)).limit(1);

  if (!settings) {
    // Return defaults using recruiter's email
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, recruiterId)).limit(1);
    res.json({ id: 0, recruiterId, frequency: "weekly", digestEmail: user?.email ?? "", lastSentAt: null, updatedAt: new Date().toISOString() });
    return;
  }

  res.json(settings);
});

// PUT /api/recruiter/digest-settings
router.put("/digest-settings", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const recruiterId = req.user!.id;
  const { frequency, digestEmail } = req.body as { frequency: "off" | "daily" | "weekly"; digestEmail: string };

  if (!frequency || !digestEmail) { res.status(400).json({ message: "frequency and digestEmail are required" }); return; }

  const [existing] = await db.select().from(digestSettingsTable).where(eq(digestSettingsTable.recruiterId, recruiterId)).limit(1);

  if (existing) {
    const [updated] = await db
      .update(digestSettingsTable)
      .set({ frequency, digestEmail, updatedAt: new Date() })
      .where(eq(digestSettingsTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(digestSettingsTable)
      .values({ recruiterId, frequency, digestEmail })
      .returning();
    res.json(created);
  }
});

// POST /api/recruiter/digest-preview — send test digest immediately
router.post("/digest-preview", authenticate, requireRole("recruiter"), async (req: AuthRequest, res) => {
  const recruiterId = req.user!.id;

  const [settings] = await db.select().from(digestSettingsTable).where(eq(digestSettingsTable.recruiterId, recruiterId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, recruiterId)).limit(1);
  const digestEmail = settings?.digestEmail ?? user?.email ?? "";
  const windowDays = settings?.frequency === "daily" ? 1 : 7;

  const previewUrl = await sendDigestForRecruiter(recruiterId, digestEmail, windowDays);

  res.json({
    message: `Digest sent to ${digestEmail}`,
    previewUrl,
  });
});

export default router;
