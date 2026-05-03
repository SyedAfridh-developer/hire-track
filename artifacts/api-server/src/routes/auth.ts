import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "hiretrack-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "hiretrack-refresh-secret";

function generateTokens(user: { id: number; email: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post("/register", async (req: AuthRequest, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !["candidate", "recruiter"].includes(role)) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, role })
    .returning();

  // Create profile or company
  if (role === "candidate") {
    await db.insert(profilesTable).values({ userId: user.id, skills: [], experience: [], education: [] });
  } else {
    await db.insert(companiesTable).values({ recruiterId: user.id, name: `${name}'s Company` });
  }

  const { accessToken, refreshToken } = generateTokens(user);
  await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const { accessToken, refreshToken } = generateTokens(user);
  await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req: AuthRequest, res) => {
  await db.update(usersTable).set({ refreshToken: null }).where(eq(usersTable.id, req.user!.id));
  res.json({ message: "Logged out" });
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401).json({ message: "Refresh token required" });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: number; email: string; role: string };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const tokens = generateTokens(user);
    await db.update(usersTable).set({ refreshToken: tokens.refreshToken }).where(eq(usersTable.id, user.id));

    res.json(tokens);
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

export default router;
