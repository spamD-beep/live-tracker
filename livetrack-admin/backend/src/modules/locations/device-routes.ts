import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { authenticate } from "../../middleware/auth.js";
import { auditLocationLookup, findVisibleDevice } from "../../services/privacy.js";

export const deviceLocationsRouter = Router();
deviceLocationsRouter.use(authenticate);

const range = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  indoors: z.enum(["hide", "show"]).default("hide")
});

deviceLocationsRouter.get("/:id/locations", async (req, res) => {
  const device = await findVisibleDevice(req.params.id, req.user!);
  if (!device) return res.status(404).json({ error: "Device not found" });
  const query = range.parse(req.query);
  const where = { deviceId: req.params.id, recordedAt: { gte: query.from, lte: query.to } };
  const [items, total] = await prisma.$transaction([
    prisma.location.findMany({ where, orderBy: { recordedAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.location.count({ where })
  ]);
  await auditLocationLookup(req.user!, "DEVICE_LOCATION_HISTORY_VIEWED", device, { page: query.page, limit: query.limit }, typeof req.ip === "string" ? req.ip : undefined);
  res.json({ items, page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) });
});

deviceLocationsRouter.get("/:id/route", async (req, res) => {
  const device = await findVisibleDevice(req.params.id, req.user!);
  if (!device) return res.status(404).json({ error: "Device not found" });
  const query = range.parse(req.query);
  let points = await prisma.location.findMany({
    where: { deviceId: req.params.id, recordedAt: { gte: query.from, lte: query.to } },
    orderBy: { recordedAt: "asc" },
    take: 5000
  });
  if (query.indoors === "hide" && points.length) {
    const estimates = await prisma.locationEstimate.findMany({
      where: { deviceId: req.params.id, officeStatus: "INSIDE", observedAt: { gte: query.from, lte: query.to } },
      select: { observedAt: true, staleAt: true },
      orderBy: { observedAt: "asc" },
      take: 5000
    });
    points = points.filter(point => !estimates.some(estimate => {
      const start = estimate.observedAt.getTime() - 120000;
      const end = (estimate.staleAt ?? new Date(estimate.observedAt.getTime() + 300000)).getTime();
      const recorded = point.recordedAt.getTime();
      return recorded >= start && recorded <= end;
    }));
  }
  await auditLocationLookup(req.user!, "DEVICE_ROUTE_VIEWED", device, { points: points.length, indoors: query.indoors }, typeof req.ip === "string" ? req.ip : undefined);
  res.json({ points });
});

deviceLocationsRouter.get("/:id/statistics", async (req, res) => {
  const device = await findVisibleDevice(req.params.id, req.user!);
  if (!device) return res.status(404).json({ error: "Device not found" });
  const query = range.parse(req.query);
  const points = await prisma.location.findMany({
    where: { deviceId: req.params.id, recordedAt: { gte: query.from, lte: query.to } },
    orderBy: { recordedAt: "asc" }
  });
  let totalDistanceKm = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const radians = Math.PI / 180;
    const x = (b.longitude - a.longitude) * radians * Math.cos((a.latitude + b.latitude) * radians / 2);
    const y = (b.latitude - a.latitude) * radians;
    totalDistanceKm += 6371 * Math.sqrt(x * x + y * y);
  }
  const speeds = points.flatMap(point => point.speed == null ? [] : [point.speed]);
  await auditLocationLookup(req.user!, "DEVICE_LOCATION_STATS_VIEWED", device, { points: points.length }, typeof req.ip === "string" ? req.ip : undefined);
  res.json({
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    averageSpeed: speeds.length ? Number((speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(2)) : 0,
    maximumSpeed: speeds.length ? Math.max(...speeds) : 0,
    points: points.length
  });
});
