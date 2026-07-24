import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { audit } from "../../services/audit.js";
import { auditLocationLookup, deviceScope, publicEstimate } from "../../services/privacy.js";
import { broadcast } from "../../sockets/index.js";
import { getStatus } from "../../utils/status.js";

export const devicesRouter = Router();
devicesRouter.use(authenticate);

const body = z.object({
  deviceUuid: z.string().min(3),
  deviceName: z.string().min(2),
  platform: z.enum(["ANDROID", "IOS", "OTHER"]).default("OTHER"),
  appVersion: z.string().optional()
});
const correctionBody = z.object({
  reportedRoomId: z.string().uuid().optional(),
  note: z.string().max(500).optional()
});

const estimateInclude = { orderBy: { createdAt: "desc" as const }, take: 1, include: { office: true, floor: true, room: true } };

devicesRouter.post("/register", async (req, res) => {
  const data = body.parse(req.body);
  const existing = await prisma.device.findUnique({ where: { deviceUuid: data.deviceUuid } });
  if (existing) {
    if (existing.userId !== req.user!.id && req.user!.role !== "ADMIN") return res.status(403).json({ error: "Device belongs to another user" });
    const device = await prisma.device.update({ where: { id: existing.id }, data: { deviceName: data.deviceName, platform: data.platform, appVersion: data.appVersion, userId: existing.userId } });
    return res.json(device);
  }
  const device = await prisma.device.create({ data: { ...data, userId: req.user!.id } });
  await audit(req.user!.id, "DEVICE_REGISTERED", "Device", device.id);
  res.status(201).json(device);
});

devicesRouter.get("/", async (req, res) => {
  const devices = await prisma.device.findMany({
    where: deviceScope(req.user!),
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      locations: { orderBy: { recordedAt: "desc" }, take: 1 },
      estimates: estimateInclude
    },
    orderBy: { deviceName: "asc" }
  });
  res.json({
    devices: devices.map(device => ({
      ...device,
      user: req.user!.role === "MOBILE_USER" ? { id: device.user.id, fullName: device.user.fullName } : device.user,
      latestLocation: device.locations[0] ?? null,
      latestEstimate: device.estimates[0] ?? null,
      locations: undefined,
      estimates: undefined,
      status: getStatus(device.lastSeenAt)
    }))
  });
});

devicesRouter.get("/me", async (req, res) => {
  const device = await prisma.device.findFirst({ where: { userId: req.user!.id }, orderBy: { updatedAt: "desc" } });
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json({ device });
});

devicesRouter.get("/:id", async (req, res) => {
  const device = await prisma.device.findFirst({
    where: { id: req.params.id, ...deviceScope(req.user!) },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      locations: { orderBy: { recordedAt: "desc" }, take: 1 },
      estimates: estimateInclude
    }
  });
  if (!device) return res.status(404).json({ error: "Device not found" });
  await auditLocationLookup(req.user!, "DEVICE_LOCATION_VIEWED", device, { view: "device-detail" }, typeof req.ip === "string" ? req.ip : undefined);
  res.json({
    ...device,
    user: req.user!.role === "MOBILE_USER" ? { id: device.user.id, fullName: device.user.fullName } : device.user,
    latestLocation: device.locations[0] ?? null,
    latestEstimate: req.user!.role === "MOBILE_USER" ? publicEstimate(device.estimates[0]) : device.estimates[0] ?? null,
    locations: undefined,
    estimates: undefined,
    status: getStatus(device.lastSeenAt)
  });
});

devicesRouter.patch("/:id", async (req, res) => {
  const existing = await prisma.device.findFirst({ where: { id: req.params.id, ...deviceScope(req.user!) } });
  if (!existing) return res.status(404).json({ error: "Device not found" });
  if (req.user!.role === "VIEWER") return res.status(403).json({ error: "Viewers cannot modify devices" });
  const data = body.omit({ deviceUuid: true }).partial().parse(req.body);
  const device = await prisma.device.update({ where: { id: existing.id }, data });
  await audit(req.user!.id, "DEVICE_UPDATED", "Device", device.id, data, typeof req.ip === "string" ? req.ip : undefined);
  broadcast("device:updated", device);
  res.json(device);
});

devicesRouter.delete("/:id", authorize("ADMIN"), async (req, res) => {
  const id = z.string().parse(req.params.id);
  const device = await prisma.device.delete({ where: { id } });
  await audit(req.user!.id, "DEVICE_DELETED", "Device", device.id, undefined, typeof req.ip === "string" ? req.ip : undefined);
  broadcast("device:removed", { id: device.id });
  res.status(204).send();
});

devicesRouter.post("/:id/corrections", async (req, res) => {
  const device = await prisma.device.findFirst({
    where: { id: req.params.id, ...deviceScope(req.user!) },
    include: { estimates: estimateInclude }
  });
  if (!device) return res.status(404).json({ error: "Device not found" });
  const data = correctionBody.parse(req.body);
  const correction = await prisma.roomCorrection.create({
    data: {
      deviceId: device.id,
      userId: req.user!.id,
      reportedRoomId: data.reportedRoomId,
      estimatedRoomId: device.estimates[0]?.roomId,
      note: data.note
    },
    include: {
      reportedRoom: { select: { id: true, name: true } },
      estimatedRoom: { select: { id: true, name: true } }
    }
  });
  await audit(req.user!.id, "ROOM_CORRECTION_REPORTED", "RoomCorrection", correction.id, {
    deviceId: device.id,
    reportedRoomId: data.reportedRoomId,
    estimatedRoomId: device.estimates[0]?.roomId
  }, typeof req.ip === "string" ? req.ip : undefined);
  res.status(201).json({ correction });
});

devicesRouter.post("/:id/:action", async (req, res) => {
  const action = z.enum(["start", "stop"]).parse(req.params.action);
  const existing = await prisma.device.findFirst({ where: { id: req.params.id, ...deviceScope(req.user!) } });
  if (!existing) return res.status(404).json({ error: "Device not found" });
  if (req.user!.role === "VIEWER") return res.status(403).json({ error: "Viewers cannot change tracking state" });
  const device = await prisma.device.update({ where: { id: existing.id }, data: { isTracking: action === "start" } });
  await audit(req.user!.id, action === "start" ? "TRACKING_STARTED" : "TRACKING_STOPPED", "Device", device.id);
  broadcast("device:updated", device);
  res.json(device);
});
