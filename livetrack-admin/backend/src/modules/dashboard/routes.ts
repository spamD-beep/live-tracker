import { Router } from "express";
import { prisma } from "../../config/db.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { deviceScope } from "../../services/privacy.js";
import { runRetentionCleanup } from "../../services/retention.js";
import { getStatus } from "../../utils/status.js";
import { estimateRoom, smoothReadings } from "../offices/estimate.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/summary", async (req, res) => {
  const devices = await prisma.device.findMany({
    where: deviceScope(req.user!),
    select: { lastSeenAt: true, isTracking: true }
  });
  const statuses = devices.map(device => getStatus(device.lastSeenAt));
  res.json({
    total: devices.length,
    online: statuses.filter(status => status === "ONLINE").length,
    idle: statuses.filter(status => status === "IDLE").length,
    offline: statuses.filter(status => status === "OFFLINE").length,
    tracking: devices.filter(device => device.isTracking).length
  });
});

dashboardRouter.get("/online-devices", async (req, res) => {
  const devices = await prisma.device.findMany({
    where: { lastSeenAt: { gte: new Date(Date.now() - 300000) }, ...deviceScope(req.user!) },
    include: { user: { select: { fullName: true } }, locations: { orderBy: { recordedAt: "desc" }, take: 1 } }
  });
  res.json({
    devices: devices.map(device => ({
      ...device,
      status: getStatus(device.lastSeenAt),
      latestLocation: device.locations[0] ?? null,
      locations: undefined
    }))
  });
});

dashboardRouter.get("/occupancy", authorize("ADMIN", "MANAGER", "VIEWER"), async (req, res) => {
  const activeWindow = new Date(Date.now() - 5 * 60_000);
  const devices = await prisma.device.findMany({
    where: { ...deviceScope(req.user!), isTracking: true, lastSeenAt: { gte: activeWindow } },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      estimates: { orderBy: { observedAt: "desc" }, take: 1, include: { office: true, floor: true, room: true } }
    },
    orderBy: { lastSeenAt: "desc" }
  });

  const groups = new Map<string, {
    office?: string | null;
    floor?: string | null;
    room?: string | null;
    status: string;
    confidenceTotal: number;
    people: {
      deviceId: string;
      deviceName: string;
      userName: string;
      userEmail?: string;
      status: string;
      confidence: number;
      observedAt?: Date;
    }[];
  }>();

  for (const device of devices) {
    const estimate = device.estimates[0];
    const room = estimate?.room?.name ?? null;
    const floor = estimate?.floor?.name ?? null;
    const office = estimate?.office?.name ?? null;
    const status = estimate?.status ?? "UNKNOWN";
    const key = estimate?.roomId ?? estimate?.floorId ?? estimate?.officeId ?? "unknown";
    const group = groups.get(key) ?? { office, floor, room, status, confidenceTotal: 0, people: [] };
    group.people.push({
      deviceId: device.id,
      deviceName: device.deviceName,
      userName: device.user.fullName,
      userEmail: req.user!.role === "MOBILE_USER" ? undefined : device.user.email,
      status,
      confidence: estimate?.confidence ?? 0,
      observedAt: estimate?.observedAt
    });
    group.confidenceTotal += estimate?.confidence ?? 0;
    groups.set(key, group);
  }

  const rooms = [...groups.values()].map(group => ({
    office: group.office,
    floor: group.floor,
    room: group.room,
    status: group.status,
    occupancy: group.people.length,
    averageConfidence: group.people.length ? Number((group.confidenceTotal / group.people.length).toFixed(4)) : 0,
    people: group.people
  })).sort((a, b) => b.occupancy - a.occupancy || (a.room ?? "Unknown").localeCompare(b.room ?? "Unknown"));

  res.json({
    window: { activeSince: activeWindow, generatedAt: new Date() },
    totals: {
      activeDevices: devices.length,
      roomsOccupied: rooms.filter(room => room.room).length,
      unknown: rooms.find(room => !room.room)?.occupancy ?? 0
    },
    rooms
  });
});

dashboardRouter.get("/recent-activity", authorize("ADMIN"), async (_req, res) => {
  res.json({
    activity: await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { fullName: true, email: true } } }
    })
  });
});

dashboardRouter.get("/quality", authorize("ADMIN", "VIEWER"), async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const lowConfidenceThreshold = 0.68;

  const [estimates, devices, rooms, observations] = await prisma.$transaction([
    prisma.locationEstimate.findMany({
      where: { observedAt: { gte: since } },
      orderBy: { observedAt: "desc" },
      include: {
        device: { select: { id: true, deviceName: true, user: { select: { fullName: true, email: true } } } },
        office: { select: { id: true, name: true } },
        floor: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } }
      },
      take: 1000
    }),
    prisma.device.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        estimates: { orderBy: { observedAt: "desc" }, take: 1, include: { room: true, floor: true, office: true } }
      }
    }),
    prisma.room.findMany({
      include: {
        floor: true,
        fingerprints: { where: { isActive: true } },
        calibrationSessions: {
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 1,
          include: { samples: true }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.locationObservation.findMany({
      where: { capturedAt: { gte: since } },
      orderBy: { capturedAt: "desc" },
      include: { device: { select: { user: { select: { fullName: true } } } } },
      take: 1000
    })
  ]);

  const totalEstimates = estimates.length;
  const unknownCount = estimates.filter(estimate => estimate.status === "UNKNOWN" || !estimate.roomId).length;
  const lowConfidenceCount = estimates.filter(estimate => estimate.confidence > 0 && estimate.confidence < lowConfidenceThreshold).length;
  const staleDevices = devices
    .filter(device => device.isTracking && (!device.lastSeenAt || device.lastSeenAt.getTime() < Date.now() - 5 * 60_000))
    .map(device => ({
      id: device.id,
      deviceName: device.deviceName,
      userName: device.user.fullName,
      lastSeenAt: device.lastSeenAt,
      secondsStale: device.lastSeenAt ? Math.round((Date.now() - device.lastSeenAt.getTime()) / 1000) : null,
      latestEstimate: device.estimates[0] ? {
        room: device.estimates[0].room?.name ?? null,
        floor: device.estimates[0].floor?.name ?? null,
        office: device.estimates[0].office?.name ?? null,
        status: device.estimates[0].status,
        confidence: device.estimates[0].confidence
      } : null
    }));

  const profiles = rooms.map(room => ({
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
  }));
  const roomNames = new Map(rooms.map(room => [room.id, room.name]));
  const confusionMatrix = rooms.map(room => {
    const predicted = new Map<string, number>();
    let total = 0;
    for (const session of room.calibrationSessions) {
      const byTimestamp = new Map<string, { bssid: string; rssi: number }[]>();
      for (const sample of session.samples) {
        const key = sample.capturedAt.toISOString();
        byTimestamp.set(key, [...(byTimestamp.get(key) ?? []), { bssid: sample.bssid, rssi: sample.rssi }]);
      }
      for (const scan of byTimestamp.values()) {
        const estimate = estimateRoom(smoothReadings([scan]), profiles);
        const predictedName = estimate?.roomId ? roomNames.get(estimate.roomId) ?? "Unknown room" : "Unknown";
        predicted.set(predictedName, (predicted.get(predictedName) ?? 0) + 1);
        total += 1;
      }
    }
    const correct = predicted.get(room.name) ?? 0;
    return {
      room: room.name,
      total,
      correct,
      accuracy: total ? Number((correct / total).toFixed(4)) : 0,
      health: total === 0 ? "NO_DATA" : correct / total >= 0.75 ? "HEALTHY" : correct / total >= 0.5 ? "NEEDS_MORE_SAMPLES" : "NEEDS_RECALIBRATION",
      predicted: [...predicted.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    };
  });

  const weakEstimateObservationTimes = new Set(
    estimates
      .filter(estimate => estimate.status === "UNKNOWN" || estimate.confidence < lowConfidenceThreshold)
      .map(estimate => `${estimate.deviceId}:${estimate.observedAt.toISOString()}`)
  );
  const bssids = new Map<string, { bssid: string; ssid?: string; count: number; totalRssi: number; minRssi: number; maxRssi: number }>();
  for (const observation of observations) {
    if (!weakEstimateObservationTimes.has(`${observation.deviceId}:${observation.capturedAt.toISOString()}`)) continue;
    const rawScan = observation.rawScan as { accessPoints?: Array<{ bssid: string; ssid?: string; rssi: number }> };
    for (const accessPoint of rawScan.accessPoints ?? []) {
      const bssid = accessPoint.bssid.trim().toLowerCase();
      if (!bssid) continue;
      const current = bssids.get(bssid) ?? { bssid, ssid: accessPoint.ssid, count: 0, totalRssi: 0, minRssi: accessPoint.rssi, maxRssi: accessPoint.rssi };
      current.count += 1;
      current.totalRssi += accessPoint.rssi;
      current.minRssi = Math.min(current.minRssi, accessPoint.rssi);
      current.maxRssi = Math.max(current.maxRssi, accessPoint.rssi);
      current.ssid = current.ssid || accessPoint.ssid;
      bssids.set(bssid, current);
    }
  }

  res.json({
    window: { since, until: new Date(), lowConfidenceThreshold },
    totals: {
      estimates: totalEstimates,
      unknown: unknownCount,
      lowConfidence: lowConfidenceCount,
      unknownRate: totalEstimates ? Number((unknownCount / totalEstimates).toFixed(4)) : 0,
      lowConfidenceRate: totalEstimates ? Number((lowConfidenceCount / totalEstimates).toFixed(4)) : 0,
      staleDevices: staleDevices.length
    },
    staleDevices,
    confusionMatrix,
    problemBssids: [...bssids.values()]
      .map(item => ({
        bssid: item.bssid,
        ssid: item.ssid ?? null,
        count: item.count,
        averageRssi: Number((item.totalRssi / item.count).toFixed(1)),
        range: `${item.minRssi} to ${item.maxRssi} dBm`
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    recentLowQuality: estimates
      .filter(estimate => estimate.status === "UNKNOWN" || estimate.confidence < lowConfidenceThreshold)
      .slice(0, 12)
      .map(estimate => ({
        id: estimate.id,
        userName: estimate.device.user.fullName,
        deviceName: estimate.device.deviceName,
        office: estimate.office?.name ?? null,
        floor: estimate.floor?.name ?? null,
        room: estimate.room?.name ?? null,
        status: estimate.status,
        confidence: estimate.confidence,
        observedAt: estimate.observedAt
      }))
  });
});

dashboardRouter.post("/retention/cleanup", authorize("ADMIN"), async (req, res) => {
  const result = await runRetentionCleanup(req.user!.id);
  res.json(result);
});
