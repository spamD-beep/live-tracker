CREATE TYPE "OfficePresence" AS ENUM ('INSIDE', 'OUTSIDE', 'UNKNOWN');
CREATE TYPE "EstimateStatus" AS ENUM ('CONFIRMED', 'PROBABLE', 'NEAR', 'UNKNOWN');
CREATE TYPE "CalibrationStatus" AS ENUM ('DRAFT', 'VALIDATING', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "Office" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 150,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "retentionDays" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Floor" (
  "id" TEXT PRIMARY KEY,
  "officeId" TEXT NOT NULL REFERENCES "Office"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "floorOrder" INTEGER NOT NULL DEFAULT 0,
  "mapImageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Room" (
  "id" TEXT PRIMARY KEY,
  "floorId" TEXT NOT NULL REFERENCES "Floor"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'ROOM',
  "zoneMetadata" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "AccessPoint" (
  "id" TEXT PRIMARY KEY,
  "officeId" TEXT NOT NULL REFERENCES "Office"("id") ON DELETE CASCADE,
  "bssid" TEXT NOT NULL,
  "ssid" TEXT,
  "band" TEXT,
  "channel" INTEGER,
  "label" TEXT,
  "stabilityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "CalibrationSession" (
  "id" TEXT PRIMARY KEY,
  "roomId" TEXT NOT NULL REFERENCES "Room"("id") ON DELETE CASCADE,
  "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "status" "CalibrationStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "FingerprintSample" (
  "id" TEXT PRIMARY KEY,
  "calibrationSessionId" TEXT NOT NULL REFERENCES "CalibrationSession"("id") ON DELETE CASCADE,
  "roomId" TEXT NOT NULL REFERENCES "Room"("id") ON DELETE CASCADE,
  "deviceId" TEXT REFERENCES "Device"("id") ON DELETE SET NULL,
  "bssid" TEXT NOT NULL,
  "ssid" TEXT,
  "rssi" INTEGER NOT NULL,
  "frequencyMhz" INTEGER,
  "deviceModel" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RoomFingerprint" (
  "id" TEXT PRIMARY KEY,
  "roomId" TEXT NOT NULL REFERENCES "Room"("id") ON DELETE CASCADE,
  "bssid" TEXT NOT NULL,
  "rssiMin" INTEGER NOT NULL,
  "rssiMax" INTEGER NOT NULL,
  "rssiMean" DOUBLE PRECISION NOT NULL,
  "rssiStddev" DOUBLE PRECISION NOT NULL,
  "visibilityRate" DOUBLE PRECISION NOT NULL,
  "sampleCount" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "LocationObservation" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "officeId" TEXT REFERENCES "Office"("id") ON DELETE SET NULL,
  "officeStatus" "OfficePresence" NOT NULL DEFAULT 'UNKNOWN',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "rawScan" JSONB NOT NULL,
  "motionState" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "LocationEstimate" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "officeId" TEXT REFERENCES "Office"("id") ON DELETE SET NULL,
  "floorId" TEXT REFERENCES "Floor"("id") ON DELETE SET NULL,
  "roomId" TEXT REFERENCES "Room"("id") ON DELETE SET NULL,
  "officeStatus" "OfficePresence" NOT NULL DEFAULT 'UNKNOWN',
  "status" "EstimateStatus" NOT NULL DEFAULT 'UNKNOWN',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'wifi-fingerprint',
  "observedAt" TIMESTAMP(3) NOT NULL,
  "staleAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Office_isActive_idx" ON "Office"("isActive");
CREATE INDEX "Floor_officeId_idx" ON "Floor"("officeId");
CREATE UNIQUE INDEX "Floor_officeId_floorOrder_key" ON "Floor"("officeId", "floorOrder");
CREATE INDEX "Room_floorId_idx" ON "Room"("floorId");
CREATE UNIQUE INDEX "Room_floorId_name_key" ON "Room"("floorId", "name");
CREATE INDEX "AccessPoint_officeId_idx" ON "AccessPoint"("officeId");
CREATE UNIQUE INDEX "AccessPoint_officeId_bssid_key" ON "AccessPoint"("officeId", "bssid");
CREATE INDEX "CalibrationSession_roomId_idx" ON "CalibrationSession"("roomId");
CREATE INDEX "CalibrationSession_createdById_idx" ON "CalibrationSession"("createdById");
CREATE INDEX "CalibrationSession_status_idx" ON "CalibrationSession"("status");
CREATE INDEX "FingerprintSample_calibrationSessionId_idx" ON "FingerprintSample"("calibrationSessionId");
CREATE INDEX "FingerprintSample_roomId_idx" ON "FingerprintSample"("roomId");
CREATE INDEX "FingerprintSample_bssid_idx" ON "FingerprintSample"("bssid");
CREATE INDEX "FingerprintSample_capturedAt_idx" ON "FingerprintSample"("capturedAt");
CREATE INDEX "RoomFingerprint_roomId_idx" ON "RoomFingerprint"("roomId");
CREATE INDEX "RoomFingerprint_bssid_idx" ON "RoomFingerprint"("bssid");
CREATE INDEX "RoomFingerprint_isActive_idx" ON "RoomFingerprint"("isActive");
CREATE UNIQUE INDEX "RoomFingerprint_roomId_bssid_version_key" ON "RoomFingerprint"("roomId", "bssid", "version");
CREATE INDEX "LocationObservation_deviceId_idx" ON "LocationObservation"("deviceId");
CREATE INDEX "LocationObservation_officeId_idx" ON "LocationObservation"("officeId");
CREATE INDEX "LocationObservation_capturedAt_idx" ON "LocationObservation"("capturedAt");
CREATE INDEX "LocationEstimate_deviceId_idx" ON "LocationEstimate"("deviceId");
CREATE INDEX "LocationEstimate_officeId_idx" ON "LocationEstimate"("officeId");
CREATE INDEX "LocationEstimate_floorId_idx" ON "LocationEstimate"("floorId");
CREATE INDEX "LocationEstimate_roomId_idx" ON "LocationEstimate"("roomId");
CREATE INDEX "LocationEstimate_observedAt_idx" ON "LocationEstimate"("observedAt");
CREATE INDEX "LocationEstimate_status_idx" ON "LocationEstimate"("status");
