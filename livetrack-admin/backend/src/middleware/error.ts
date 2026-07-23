import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
export function notFound(req: Request, res: Response) { res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }); }
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  const e = err as { status?: number; message?: string; code?: string };
  if (e.code === "P2002") return res.status(409).json({ error: "Record already exists" });
  res.status(e.status ?? 500).json({ error: e.message ?? "Internal server error" });
}
