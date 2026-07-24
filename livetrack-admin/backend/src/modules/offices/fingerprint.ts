export type FingerprintReading = {
  bssid: string;
  rssi: number;
};

export type ComputedFingerprint = {
  bssid: string;
  rssiMin: number;
  rssiMax: number;
  rssiMean: number;
  rssiStddev: number;
  visibilityRate: number;
  sampleCount: number;
};

export function computeFingerprints(readings: FingerprintReading[]): ComputedFingerprint[] {
  const byBssid = new Map<string, number[]>();
  for (const reading of readings) {
    const key = reading.bssid.trim().toLowerCase();
    if (!key) continue;
    byBssid.set(key, [...(byBssid.get(key) ?? []), reading.rssi]);
  }

  return [...byBssid.entries()]
    .map(([bssid, values]) => {
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
      return {
        bssid,
        rssiMin: Math.min(...values),
        rssiMax: Math.max(...values),
        rssiMean: Number(mean.toFixed(2)),
        rssiStddev: Number(Math.sqrt(variance).toFixed(2)),
        visibilityRate: Number((values.length / readings.length).toFixed(4)),
        sampleCount: values.length
      };
    })
    .sort((a, b) => b.sampleCount - a.sampleCount || a.bssid.localeCompare(b.bssid));
}
