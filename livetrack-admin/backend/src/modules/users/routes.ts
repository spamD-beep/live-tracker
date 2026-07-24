import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { audit } from "../../services/audit.js";
import { deviceScope } from "../../services/privacy.js";
import { getStatus } from "../../utils/status.js";

export const usersRouter = Router();
usersRouter.use(authenticate);

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  managerId: true,
  isActive: true,
  createdAt: true,
  manager: { select: { id: true, fullName: true, email: true } },
  _count: { select: { devices: true, reports: true } }
};

const roleSchema = z.enum(["ADMIN", "MANAGER", "VIEWER", "MOBILE_USER"]);

usersRouter.get("/me/status", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      manager: { select: { id: true, fullName: true, email: true } },
      devices: {
        orderBy: { updatedAt: "desc" },
        include: {
          locations: { orderBy: { recordedAt: "desc" }, take: 1 },
          estimates: { orderBy: { observedAt: "desc" }, take: 1, include: { office: true, floor: true, room: true } }
        }
      }
    }
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      manager: user.manager
    },
    devices: user.devices.map(device => ({
      id: device.id,
      deviceName: device.deviceName,
      platform: device.platform,
      isTracking: device.isTracking,
      lastSeenAt: device.lastSeenAt,
      status: getStatus(device.lastSeenAt),
      latestLocation: device.locations[0] ?? null,
      latestEstimate: device.estimates[0] ?? null
    }))
  });
});

usersRouter.get("/team", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const q = z.string().optional().parse(req.query.q)?.trim();
  const users = await prisma.user.findMany({
    where: {
      ...(req.user!.role === "MANAGER" ? { managerId: req.user!.id } : {}),
      ...(q ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { devices: { some: { deviceName: { contains: q, mode: "insensitive" } } } }
        ]
      } : {})
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      devices: {
        where: deviceScope(req.user!),
        include: {
          locations: { orderBy: { recordedAt: "desc" }, take: 1 },
          estimates: { orderBy: { observedAt: "desc" }, take: 1, include: { office: true, floor: true, room: true } }
        }
      }
    },
    orderBy: { fullName: "asc" },
    take: 50
  });
  res.json({
    users: users.map(user => ({
      ...user,
      devices: user.devices.map(device => ({
        ...device,
        status: getStatus(device.lastSeenAt),
        latestLocation: device.locations[0] ?? null,
        latestEstimate: device.estimates[0] ?? null,
        locations: undefined,
        estimates: undefined
      }))
    }))
  });
});

usersRouter.get("/", authorize("ADMIN"), async (_req, res) => {
  res.json({
    users: await prisma.user.findMany({
      select: userSelect,
      orderBy: { fullName: "asc" }
    })
  });
});

usersRouter.post("/", authorize("ADMIN"), async (req, res) => {
  const data = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: roleSchema,
    managerId: z.string().uuid().nullable().optional()
  }).parse(req.body);
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(data.password, 12),
      role: data.role,
      managerId: data.managerId
    },
    select: userSelect
  });
  await audit(req.user!.id, "USER_CREATED", "User", user.id);
  res.status(201).json(user);
});

usersRouter.patch("/:id", authorize("ADMIN"), async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = z.object({
    fullName: z.string().min(2).optional(),
    role: roleSchema.optional(),
    managerId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional()
  }).parse(req.body);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: userSelect
  });
  await audit(req.user!.id, "USER_UPDATED", "User", user.id, data);
  res.json(user);
});
