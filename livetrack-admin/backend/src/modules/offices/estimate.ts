export type ObservationReading = {
  bssid: string;
  rssi: number;
};

export type RoomProfile = {
  officeId: string;
  floorId: string;
  roomId: string;
  fingerprints: {
    bssid: string;
    rssiMean: number;
    rssiStddev?: number;
    sampleCount?: number;
    visibilityRate?: number;
  }[];
};

export type RoomEstimate = {
  officeId: string;
  floorId: string;
  roomId?: string;
  confidence: number;
  status: "CONFIRMED" | "PROBABLE" | "NEAR" | "UNKNOWN";
};

export type RecentRoomEstimate = {
  roomId?: string | null;
  confidence: number;
  status: "CONFIRMED" | "PROBABLE" | "NEAR" | "UNKNOWN";
  observedAt: Date;
};

export function smoothReadings(scans: ObservationReading[][]): ObservationReading[] {
  const byBssid = new Map<string, number[]>();
  for (const scan of scans) {
    for (const reading of scan) {
      const bssid = reading.bssid.trim().toLowerCase();
      if (!bssid || reading.rssi < -120 || reading.rssi > 0) continue;
      byBssid.set(bssid, [...(byBssid.get(bssid) ?? []), reading.rssi]);
    }
  }

  return [...byBssid.entries()].map(([bssid, values]) => ({
    bssid,
    rssi: median(values)
  }));
}

export function estimateRoom(readings: ObservationReading[], profiles: RoomProfile[]): RoomEstimate | undefined {
  const readingMap = new Map(readings.map(reading => [reading.bssid.trim().toLowerCase(), reading.rssi]));
  if (!readingMap.size) return undefined;

  const candidates = profiles.flatMap(profile => {
    const active = profile.fingerprints.filter(fingerprint => readingMap.has(fingerprint.bssid.toLowerCase()));
    if (!active.length || !profile.fingerprints.length) return [];

    const weighted = active.reduce((totals, fingerprint) => {
      const observed = readingMap.get(fingerprint.bssid.toLowerCase())!;
      const tolerance = Math.max(24, 18 + (fingerprint.rssiStddev ?? 6));
      const distance = Math.abs(observed - fingerprint.rssiMean);
      const reliability = Math.max(1, Math.log2((fingerprint.sampleCount ?? 1) + 1)) * (fingerprint.visibilityRate ?? 1);
      return {
        score: totals.score + Math.max(0, 1 - distance / tolerance) * reliability,
        weight: totals.weight + reliability
      };
    }, { score: 0, weight: 0 });

    const similarity = weighted.weight ? weighted.score / weighted.weight : 0;
    const profileCoverage = active.length / profile.fingerprints.length;
    const scanCoverage = active.length / readingMap.size;
    const missingProfileRatio = 1 - profileCoverage;
    const extraScanRatio = 1 - scanCoverage;
    const confidence = clamp01(
      similarity * 0.68 +
      profileCoverage * 0.16 +
      scanCoverage * 0.16 -
      missingProfileRatio * 0.08 -
      extraScanRatio * 0.14
    );
    return [{ ...profile, confidence: Number(confidence.toFixed(4)) }];
  });

  const [best, second] = candidates.sort((a, b) => b.confidence - a.confidence);
  if (!best) return undefined;
  const margin = second ? best.confidence - second.confidence : 1;
  const adjustedConfidence = margin < 0.06
    ? Math.min(Math.max(0, best.confidence - 0.18), 0.66)
    : margin < 0.12
      ? Math.min(Math.max(0, best.confidence - 0.1), 0.67)
      : margin < 0.18
        ? Math.min(best.confidence, 0.78)
        : best.confidence;
  const status = adjustedConfidence >= 0.85 && margin >= 0.08
    ? "CONFIRMED"
    : adjustedConfidence >= 0.68
      ? "PROBABLE"
      : adjustedConfidence >= 0.42
        ? "NEAR"
        : "UNKNOWN";
  return {
    officeId: best.officeId,
    floorId: best.floorId,
    roomId: status === "UNKNOWN" ? undefined : best.roomId,
    confidence: Number(adjustedConfidence.toFixed(4)),
    status
  };
}

export function stabilizeRoomEstimate(candidate: RoomEstimate | undefined, recent: RecentRoomEstimate[], observedAt: Date): RoomEstimate | undefined {
  if (!candidate || !candidate.roomId || candidate.status === "UNKNOWN") return candidate;
  const windowStart = observedAt.getTime() - 60_000;
  const validRecent = recent
    .filter(estimate => estimate.roomId && estimate.observedAt.getTime() >= windowStart)
    .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
  const lastRoom = validRecent[0]?.roomId;
  if (!lastRoom || lastRoom === candidate.roomId) return candidate;

  const sameRoomRecent = validRecent.filter(estimate => estimate.roomId === candidate.roomId);
  const hasStableLead = sameRoomRecent.length >= 1 || candidate.confidence >= 0.92;
  if (hasStableLead) return candidate;

  return {
    ...candidate,
    confidence: Number(Math.min(candidate.confidence, 0.66).toFixed(4)),
    status: candidate.confidence >= 0.42 ? "NEAR" : "UNKNOWN"
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2) : sorted[middle]!;
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toRad;
  const dLon = (b.longitude - a.longitude) * toRad;
  const lat1 = a.latitude * toRad;
  const lat2 = b.latitude * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}
