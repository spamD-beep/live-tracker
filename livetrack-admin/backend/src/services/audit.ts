import { prisma } from "../config/db.js";
export const audit = (userId: string | undefined, action: string, entityType: string, entityId?: string, metadata?: object, ipAddress?: string) =>
  prisma.auditLog.create({ data: { userId, action, entityType, entityId, metadata, ipAddress } });
