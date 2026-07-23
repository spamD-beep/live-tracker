import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAccess } from "../utils/auth.js";
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try { const c = verifyAccess(token); req.user = { id: c.sub, role: c.role, email: c.email }; next(); }
  catch { res.status(401).json({ error: "Invalid or expired access token" }); }
}
export const authorize = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) =>
  req.user && roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Insufficient permissions" });
