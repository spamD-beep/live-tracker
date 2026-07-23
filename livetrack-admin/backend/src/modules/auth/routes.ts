import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { authenticate } from "../../middleware/auth.js";
import { audit } from "../../services/audit.js";
import { hashToken, refreshExpiry, signAccess, signRefresh, verifyRefresh } from "../../utils/auth.js";
export const authRouter = Router();
const credentials = z.object({ email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(8) });
const publicUser = (u: { id: string; fullName: string; email: string; role: string; isActive: boolean }) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, isActive: u.isActive });
authRouter.post("/register", async (req, res) => {
  const data = credentials.extend({ fullName: z.string().min(2) }).parse(req.body);
  const count = await prisma.user.count();
  const user = await prisma.user.create({ data: { fullName: data.fullName, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: count ? "MOBILE_USER" : "ADMIN" } });
  res.status(201).json({ user: publicUser(user) });
});
authRouter.post("/login", async (req, res) => {
  const data = credentials.parse(req.body); const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.isActive || !await bcrypt.compare(data.password, user.passwordHash)) return res.status(401).json({ error: "Invalid email or password" });
  const claims = { sub: user.id, role: user.role, email: user.email };
  const accessToken = signAccess(claims), refreshToken = signRefresh(claims);
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiry() } });
  await audit(user.id, "LOGIN", "User", user.id, undefined, req.ip);
  res.json({ accessToken, refreshToken, user: publicUser(user) });
});
authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body); const c = verifyRefresh(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) }, include: { user: true } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive) return res.status(401).json({ error: "Invalid refresh token" });
  res.json({ accessToken: signAccess({ sub: c.sub, role: c.role, email: c.email }) });
});
authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } }); res.status(204).send();
});
authRouter.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } }); res.json({ user: publicUser(user) });
});
