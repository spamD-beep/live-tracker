ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';

ALTER TABLE "User" ADD COLUMN "managerId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

CREATE TABLE "RoomCorrection" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reportedRoomId" TEXT,
  "estimatedRoomId" TEXT,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "RoomCorrection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RoomCorrection" ADD CONSTRAINT "RoomCorrection_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomCorrection" ADD CONSTRAINT "RoomCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomCorrection" ADD CONSTRAINT "RoomCorrection_reportedRoomId_fkey" FOREIGN KEY ("reportedRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoomCorrection" ADD CONSTRAINT "RoomCorrection_estimatedRoomId_fkey" FOREIGN KEY ("estimatedRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RoomCorrection_deviceId_idx" ON "RoomCorrection"("deviceId");
CREATE INDEX "RoomCorrection_userId_idx" ON "RoomCorrection"("userId");
CREATE INDEX "RoomCorrection_reportedRoomId_idx" ON "RoomCorrection"("reportedRoomId");
CREATE INDEX "RoomCorrection_status_idx" ON "RoomCorrection"("status");
