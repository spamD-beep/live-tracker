import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../config/db.js";
import { audit } from "../../services/audit.js";
import { computeFingerprints } from "./fingerprint.js";
import { distanceMeters, estimateRoom, smoothReadings, stabilizeRoomEstimate } from "./estimate.js";

export const officesRouter = Router();
officesRouter.use(authenticate);

const officeBody = z.object({
  name: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofenceRadiusMeters: z.number().int().positive().max(5000).default(150),
  timezone: z.string().min(1).default("UTC"),
  retentionDays: z.number().int().positive().max(365).default(30)
});

const floorBody = z.object({
  name: z.string().min(1),
  floorOrder: z.number().int().default(0),
  mapImageUrl: z.string().url().optional()
});

const roomBody = z.object({
  name: z.string().min(1),
  type: z.string().min(1).default("ROOM"),
  zoneMetadata: z.record(z.unknown()).optional()
});

const accessPointBody = z.object({
  bssid: z.string().min(5).transform(value => value.trim().toLowerCase()),
  ssid: z.string().optional(),
  band: z.string().optional(),
  channel: z.number().int().positive().optional(),
  label: z.string().optional(),
  stabilityStatus: z.string().default("UNKNOWN")
});

const calibrationSessionBody = z.object({
  notes: z.string().optional()
});

const sampleBody = z.object({
  samples: z.array(z.object({
    bssid: z.string().min(5).transform(value => value.trim().toLowerCase()),
    ssid: z.string().optional(),
    rssi: z.number().int().min(-120).max(0),
    frequencyMhz: z.number().int().positive().optional(),
    deviceModel: z.string().optional(),
    capturedAt: z.coerce.date()
  })).min(1).max(500)
});

const observationSamplesBody = z.object({
  observationIds: z.array(z.string().uuid()).min(1).max(20),
  deviceModel: z.string().optional()
});

const observationBody = z.object({
  deviceId: z.string().uuid(),
  officeId: z.string().uuid().optional(),
  officeStatus: z.enum(["INSIDE", "OUTSIDE", "UNKNOWN"]).default("UNKNOWN"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().nonnegative().optional(),
  rawScan: z.object({
    accessPoints: z.array(z.object({
      bssid: z.string().min(5).transform(value => value.trim().toLowerCase()),
      ssid: z.string().optional(),
      rssi: z.number().int().min(-120).max(0),
      frequencyMhz: z.number().int().positive().optional()
    })).max(500)
  }),
  motionState: z.string().optional(),
  capturedAt: z.coerce.date()
});

officesRouter.get("/", async (_req, res) => {
  const offices = await prisma.office.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { floors: true, accessPoints: true, observations: true, estimates: true } }
    }
  });
  res.json({ offices });
});

officesRouter.post("/", authorize("ADMIN"), async (req, res) => {
  const data = officeBody.parse(req.body);
  const office = await prisma.office.create({ data });
  await audit(req.user!.id, "OFFICE_CREATED", "Office", office.id);
  res.status(201).json({ office });
});

officesRouter.get("/:officeId/structure", async (req, res) => {
  const officeId = z.string().parse(req.params.officeId);
  const office = await prisma.office.findUnique({
    where: { id: officeId },
    include: {
      floors: {
        orderBy: { floorOrder: "asc" },
        include: {
          rooms: {
            orderBy: { name: "asc" },
            include: {
              _count: { select: { calibrationSessions: true, fingerprintSamples: true, fingerprints: true } },
              calibrationSessions: {
                orderBy: { startedAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  startedAt: true,
                  publishedAt: true,
                  _count: { select: { samples: true } }
                }
              },
              fingerprints: {
                where: { isActive: true },
                orderBy: { sampleCount: "desc" },
                select: { id: true, bssid: true, sampleCount: true, publishedAt: true }
              }
            }
          }
        }
      },
      accessPoints: { orderBy: { bssid: "asc" } }
    }
  });
  if (!office) return res.status(404).json({ error: "Office not found" });
  res.json({ office });
});

officesRouter.get("/:officeId/recent-observations", authorize("ADMIN"), async (req, res) => {
  const officeId = z.string().parse(req.params.officeId);
  const limit = z.coerce.number().int().positive().max(100).default(50).parse(req.query.limit ?? 50);
  const observations = await prisma.locationObservation.findMany({
    where: { officeId },
    orderBy: { capturedAt: "desc" },
    take: limit,
    include: {
      device: {
        select: {
          id: true,
          deviceName: true,
          user: { select: { fullName: true, email: true } }
        }
      }
    }
  });
  res.json({
    observations: observations.map(observation => {
      const rawScan = observation.rawScan as { accessPoints?: Array<{ bssid: string; ssid?: string; rssi: number; frequencyMhz?: number }> };
      const accessPoints = Array.isArray(rawScan?.accessPoints) ? rawScan.accessPoints : [];
      return {
        id: observation.id,
        officeStatus: observation.officeStatus,
        capturedAt: observation.capturedAt,
        receivedAt: observation.receivedAt,
        device: observation.device,
        accessPointCount: accessPoints.length,
        accessPoints: accessPoints.slice(0, 12)
      };
    })
  });
});

officesRouter.post("/:officeId/floors", authorize("ADMIN"), async (req, res) => {
  const officeId = z.string().parse(req.params.officeId);
  const data = floorBody.parse(req.body);
  const floor = await prisma.floor.create({ data: { ...data, officeId } });
  await audit(req.user!.id, "FLOOR_CREATED", "Floor", floor.id, { officeId });
  res.status(201).json({ floor });
});

officesRouter.post("/:officeId/access-points", authorize("ADMIN"), async (req, res) => {
  const officeId = z.string().parse(req.params.officeId);
  const data = accessPointBody.parse(req.body);
  const accessPoint = await prisma.accessPoint.upsert({
    where: { officeId_bssid: { officeId, bssid: data.bssid } },
    create: { ...data, officeId, lastSeenAt: new Date() },
    update: { ...data, lastSeenAt: new Date() }
  });
  await audit(req.user!.id, "ACCESS_POINT_UPSERTED", "AccessPoint", accessPoint.id, { officeId });
  res.status(201).json({ accessPoint });
});

officesRouter.post("/floors/:floorId/rooms", authorize("ADMIN"), async (req, res) => {
  const floorId = z.string().parse(req.params.floorId);
  const data = roomBody.parse(req.body);
  const room = await prisma.room.create({
    data: {
      floorId,
      name: data.name,
      type: data.type,
      zoneMetadata: data.zoneMetadata as Prisma.InputJsonValue | undefined
    }
  });
  await audit(req.user!.id, "ROOM_CREATED", "Room", room.id, { floorId });
  res.status(201).json({ room });
});

officesRouter.post("/rooms/:roomId/calibration-sessions", authorize("ADMIN"), async (req, res) => {
  const roomId = z.string().parse(req.params.roomId);
  const data = calibrationSessionBody.parse(req.body);
  const session = await prisma.calibrationSession.create({
    data: { ...data, roomId, createdById: req.user!.id }
  });
  await audit(req.user!.id, "CALIBRATION_STARTED", "CalibrationSession", session.id, { roomId });
  res.status(201).json({ session });
});

officesRouter.post("/calibration-sessions/:sessionId/samples", authorize("ADMIN"), async (req, res) => {
  const sessionId = z.string().parse(req.params.sessionId);
  const data = sampleBody.parse(req.body);
  const session = await prisma.calibrationSession.findUnique({
    where: { id: sessionId }
  });
  if (!session) return res.status(404).json({ error: "Calibration session not found" });
  const room = await prisma.room.findUnique({ where: { id: session.roomId }, include: { floor: true } });
  if (!room) return res.status(404).json({ error: "Calibration room not found" });

  await prisma.$transaction([
    prisma.fingerprintSample.createMany({
      data: data.samples.map(sample => ({
        ...sample,
        calibrationSessionId: session.id,
        roomId: session.roomId
      }))
    }),
    prisma.calibrationSession.update({
      where: { id: session.id },
      data: { status: "VALIDATING" }
    }),
    ...data.samples.map((sample) => prisma.accessPoint.upsert({
      where: { officeId_bssid: { officeId: room.floor.officeId, bssid: sample.bssid } },
      create: {
        officeId: room.floor.officeId,
        bssid: sample.bssid,
        ssid: sample.ssid,
        lastSeenAt: sample.capturedAt
      },
      update: {
        ssid: sample.ssid,
        lastSeenAt: sample.capturedAt
      }
    }))
  ]);

  await audit(req.user!.id, "CALIBRATION_SAMPLES_ADDED", "CalibrationSession", session.id, { count: data.samples.length });
  res.status(201).json({ added: data.samples.length });
});

officesRouter.post("/calibration-sessions/:sessionId/samples-from-observations", authorize("ADMIN"), async (req, res) => {
  const sessionId = z.string().parse(req.params.sessionId);
  const data = observationSamplesBody.parse(req.body);
  const session = await prisma.calibrationSession.findUnique({
    where: { id: sessionId }
  });
  if (!session) return res.status(404).json({ error: "Calibration session not found" });
  const room = await prisma.room.findUnique({ where: { id: session.roomId }, include: { floor: true } });
  if (!room) return res.status(404).json({ error: "Calibration room not found" });
  const observations = await prisma.locationObservation.findMany({
    where: {
      id: { in: data.observationIds },
      officeId: room.floor.officeId
    }
  });
  if (!observations.length) return res.status(404).json({ error: "No matching office observations found" });

  const samples = observations.flatMap(observation => {
    const rawScan = observation.rawScan as { accessPoints?: Array<{ bssid: string; ssid?: string; rssi: number; frequencyMhz?: number }> };
    const accessPoints = Array.isArray(rawScan?.accessPoints) ? rawScan.accessPoints : [];
    return accessPoints.map(accessPoint => ({
      calibrationSessionId: session.id,
      roomId: session.roomId,
      deviceId: observation.deviceId,
      bssid: accessPoint.bssid.trim().toLowerCase(),
      ssid: accessPoint.ssid,
      rssi: accessPoint.rssi,
      frequencyMhz: accessPoint.frequencyMhz,
      deviceModel: data.deviceModel,
      capturedAt: observation.capturedAt
    }));
  }).filter(sample => sample.bssid && sample.rssi >= -120 && sample.rssi <= 0);
  if (!samples.length) return res.status(400).json({ error: "Selected observations do not contain Wi-Fi readings" });

  await prisma.$transaction([
    prisma.fingerprintSample.createMany({ data: samples }),
    prisma.calibrationSession.update({
      where: { id: session.id },
      data: { status: "VALIDATING" }
    }),
    ...samples.map(sample => prisma.accessPoint.upsert({
      where: { officeId_bssid: { officeId: room.floor.officeId, bssid: sample.bssid } },
      create: {
        officeId: room.floor.officeId,
        bssid: sample.bssid,
        ssid: sample.ssid,
        lastSeenAt: sample.capturedAt
      },
      update: {
        ssid: sample.ssid,
        lastSeenAt: sample.capturedAt
      }
    }))
  ]);

  await audit(req.user!.id, "CALIBRATION_OBSERVATIONS_IMPORTED", "CalibrationSession", session.id, { observations: observations.length, samples: samples.length });
  res.status(201).json({ importedObservations: observations.length, added: samples.length });
});

officesRouter.post("/calibration-sessions/:sessionId/publish", authorize("ADMIN"), async (req, res) => {
  const sessionId = z.string().parse(req.params.sessionId);
  const session = await prisma.calibrationSession.findUnique({
    where: { id: sessionId }
  });
  if (!session) return res.status(404).json({ error: "Calibration session not found" });
  const samples = await prisma.fingerprintSample.findMany({ where: { calibrationSessionId: session.id } });
  if (!samples.length) return res.status(400).json({ error: "Calibration session has no samples" });

  const latest = await prisma.roomFingerprint.aggregate({
    where: { roomId: session.roomId },
    _max: { version: true }
  });
  const version = (latest._max.version ?? 0) + 1;
  const fingerprints = computeFingerprints(samples.map(sample => ({ bssid: sample.bssid, rssi: sample.rssi })));

  await prisma.$transaction([
    prisma.roomFingerprint.updateMany({ where: { roomId: session.roomId, isActive: true }, data: { isActive: false } }),
    prisma.roomFingerprint.createMany({
      data: fingerprints.map(fingerprint => ({ ...fingerprint, roomId: session.roomId, version }))
    }),
    prisma.calibrationSession.update({
      where: { id: session.id },
      data: { status: "PUBLISHED", completedAt: new Date(), publishedAt: new Date() }
    })
  ]);

  await audit(req.user!.id, "CALIBRATION_PUBLISHED", "CalibrationSession", session.id, { version, fingerprints: fingerprints.length });
  res.json({ version, fingerprints });
});

officesRouter.post("/observations", async (req, res) => {
  const data = observationBody.parse(req.body);
  const device = await prisma.device.findFirst({
    where: { id: data.deviceId, ...(req.user!.role === "ADMIN" ? {} : { userId: req.user!.id }) }
  });
  if (!device) return res.status(404).json({ error: "Device not found" });

  const offices = data.officeId ? [] : await prisma.office.findMany({ where: { isActive: true } });
  const nearestOffice = data.officeId ? undefined : offices
    .map(office => ({
      office,
      distance: data.latitude == null || data.longitude == null ? Number.POSITIVE_INFINITY : distanceMeters(
        { latitude: data.latitude, longitude: data.longitude },
        { latitude: office.latitude, longitude: office.longitude }
      )
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  const inferredOfficeId = data.officeId ?? (nearestOffice && nearestOffice.distance <= nearestOffice.office.geofenceRadiusMeters ? nearestOffice.office.id : undefined);
  const officeStatus = data.officeStatus !== "UNKNOWN" ? data.officeStatus : inferredOfficeId ? "INSIDE" : data.latitude == null ? "UNKNOWN" : "OUTSIDE";
  const shouldRetainWifiScan = Boolean(inferredOfficeId && officeStatus === "INSIDE");
  const retainedRawScan: typeof data.rawScan = shouldRetainWifiScan ? data.rawScan : { accessPoints: [] };

  const observation = await prisma.locationObservation.create({
    data: {
      deviceId: data.deviceId,
      officeId: inferredOfficeId,
      officeStatus,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      rawScan: retainedRawScan,
      motionState: data.motionState,
      capturedAt: data.capturedAt
    }
  });

  let estimate = null;
  if (shouldRetainWifiScan && inferredOfficeId) {
    await Promise.all(retainedRawScan.accessPoints.map(accessPoint => prisma.accessPoint.upsert({
      where: { officeId_bssid: { officeId: inferredOfficeId, bssid: accessPoint.bssid } },
      create: {
        officeId: inferredOfficeId,
        bssid: accessPoint.bssid,
        ssid: accessPoint.ssid,
        lastSeenAt: data.capturedAt
      },
      update: {
        ssid: accessPoint.ssid,
        lastSeenAt: data.capturedAt
      }
    })));

    const rooms = await prisma.room.findMany({
      where: { isActive: true, floor: { officeId: inferredOfficeId } },
      include: { floor: true, fingerprints: { where: { isActive: true } } }
    });
    const recentObservations = await prisma.locationObservation.findMany({
      where: {
        id: { not: observation.id },
        deviceId: data.deviceId,
        officeId: inferredOfficeId,
        capturedAt: { gte: new Date(data.capturedAt.getTime() - 60_000), lte: data.capturedAt }
      },
      orderBy: { capturedAt: "desc" },
      take: 3
    });
    const recentScans = recentObservations.map(recentObservation => {
      const rawScan = recentObservation.rawScan as { accessPoints?: Array<{ bssid: string; rssi: number }> };
      return Array.isArray(rawScan?.accessPoints) ? rawScan.accessPoints : [];
    });
    const estimateReadings = smoothReadings([retainedRawScan.accessPoints, ...recentScans]);
    const rawRoomEstimate = estimateRoom(estimateReadings, rooms.map(room => ({
      officeId: room.floor.officeId,
      floorId: room.floorId,
      roomId: room.id,
      fingerprints: room.fingerprints.map(fingerprint => ({
        bssid: fingerprint.bssid,
        rssiMean: fingerprint.rssiMean,
        rssiStddev: fingerprint.rssiStddev,
        sampleCount: fingerprint.sampleCount,
        visibilityRate: fingerprint.visibilityRate
      }))
    })));
    const recentEstimates = await prisma.locationEstimate.findMany({
      where: {
        deviceId: data.deviceId,
        officeId: inferredOfficeId,
        observedAt: { gte: new Date(data.capturedAt.getTime() - 60_000), lt: data.capturedAt }
      },
      orderBy: { observedAt: "desc" },
      take: 5
    });
    const roomEstimate = stabilizeRoomEstimate(rawRoomEstimate, recentEstimates, data.capturedAt);

    estimate = await prisma.locationEstimate.create({
      data: {
        deviceId: data.deviceId,
        officeId: inferredOfficeId,
        floorId: roomEstimate?.floorId,
        roomId: roomEstimate?.roomId,
        officeStatus,
        status: roomEstimate?.status ?? "UNKNOWN",
        confidence: roomEstimate?.confidence ?? 0,
        observedAt: data.capturedAt,
        staleAt: new Date(data.capturedAt.getTime() + 5 * 60_000)
      }
    });
  }

  res.status(201).json({ observation, estimate });
});
