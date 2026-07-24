import type { Device, LocationEstimate } from "@prisma/client";
import { prisma } from "../config/db.js";
import { audit } from "./audit.js";

type AuthUser = NonNullable<Express.Request["user"]>;

export const canViewFleet = (user: AuthUser) => user.role === "ADMIN" || user.role === "VIEWER";
export const canViewTeam = (user: AuthUser) => user.role === "MANAGER";
export const deviceScope = (user: AuthUser) => {
  if (canViewFleet(user)) return {};
  if (canViewTeam(user)) return { OR: [{ userId: user.id }, { user: { managerId: user.id } }] };
  return { userId: user.id };
};

export async function findVisibleDevice(deviceId: string, user: AuthUser) {
  return prisma.device.findFirst({ where: { id: deviceId, ...deviceScope(user) } });
}

export async function auditLocationLookup(
  user: AuthUser,
  action: string,
  device: Pick<Device, "id" | "userId">,
  metadata?: object,
  ipAddress?: string
) {
  const isOwnDevice = device.userId === user.id;
  if (isOwnDevice && user.role === "MOBILE_USER") return;
  await audit(user.id, action, "Device", device.id, { targetUserId: device.userId, ...metadata }, ipAddress);
}

export function publicEstimate(estimate: (LocationEstimate & {
  office?: { name: string } | null;
  floor?: { name: string } | null;
  room?: { name: string } | null;
}) | null | undefined) {
  if (!estimate) return null;
  return {
    office: estimate.office?.name ?? null,
    floor: estimate.floor?.name ?? null,
    room: estimate.room?.name ?? null,
    officeStatus: estimate.officeStatus,
    status: estimate.status,
    confidence: estimate.confidence,
    observedAt: estimate.observedAt,
    staleAt: estimate.staleAt,
    source: estimate.source
  };
}
