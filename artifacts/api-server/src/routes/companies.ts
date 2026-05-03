import { Router } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/companies/me
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.recruiterId, req.user!.id))
    .limit(1);

  if (!company) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  res.json(company);
});

// PUT /api/companies/me
router.put("/me", authenticate, async (req: AuthRequest, res) => {
  const { name, description, website, location, industry, size } = req.body;

  const [existing] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.recruiterId, req.user!.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "Company not found" });
    return;
  }

  const [updated] = await db
    .update(companiesTable)
    .set({
      name: name ?? existing.name,
      description: description ?? existing.description,
      website: website ?? existing.website,
      location: location ?? existing.location,
      industry: industry ?? existing.industry,
      size: size ?? existing.size,
    })
    .where(eq(companiesTable.recruiterId, req.user!.id))
    .returning();

  res.json(updated);
});

// GET /api/companies/:companyId
router.get("/:companyId", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) {
    res.status(400).json({ message: "Invalid company ID" });
    return;
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);

  if (!company) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  res.json(company);
});

export default router;
