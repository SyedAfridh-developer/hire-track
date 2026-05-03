import { Router } from "express";
import { db, profilesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

async function getProfileWithUser(userId: number) {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!profile || !user) return null;
  return {
    ...profile,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  };
}

// GET /api/profile
router.get("/", authenticate, async (req: AuthRequest, res) => {
  const data = await getProfileWithUser(req.user!.id);
  if (!data) {
    res.status(404).json({ message: "Profile not found" });
    return;
  }
  res.json(data);
});

// PUT /api/profile
router.put("/", authenticate, async (req: AuthRequest, res) => {
  const { headline, bio, location, phone, skills, experience, education } = req.body;

  const [existing] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, req.user!.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "Profile not found" });
    return;
  }

  await db
    .update(profilesTable)
    .set({
      headline: headline ?? existing.headline,
      bio: bio ?? existing.bio,
      location: location ?? existing.location,
      phone: phone ?? existing.phone,
      skills: skills ?? existing.skills,
      experience: experience ?? existing.experience,
      education: education ?? existing.education,
    })
    .where(eq(profilesTable.userId, req.user!.id));

  const data = await getProfileWithUser(req.user!.id);
  res.json(data);
});

// POST /api/profile/resume
router.post("/resume", authenticate, async (req: AuthRequest, res) => {
  const { fileName, fileData } = req.body;

  if (!fileName || !fileData) {
    res.status(400).json({ message: "fileName and fileData required" });
    return;
  }

  // Store as a data URL (base64) — in production this would go to Cloudinary
  const resumeUrl = `data:application/pdf;base64,${fileData}`;

  await db
    .update(profilesTable)
    .set({ resumeUrl })
    .where(eq(profilesTable.userId, req.user!.id));

  res.json({ resumeUrl });
});

export default router;
