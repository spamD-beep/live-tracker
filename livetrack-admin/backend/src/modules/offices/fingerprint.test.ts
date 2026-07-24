import { describe, expect, it } from "vitest";
import { computeFingerprints } from "./fingerprint.js";

describe("fingerprint computation", () => {
  it("groups BSSID readings and calculates RSSI statistics", () => {
    const result = computeFingerprints([
      { bssid: "AA:BB", rssi: -50 },
      { bssid: "aa:bb", rssi: -60 },
      { bssid: "CC:DD", rssi: -70 }
    ]);

    expect(result[0]).toEqual({
      bssid: "aa:bb",
      rssiMin: -60,
      rssiMax: -50,
      rssiMean: -55,
      rssiStddev: 5,
      visibilityRate: 0.6667,
      sampleCount: 2
    });
  });

  it("ignores blank BSSID values", () => {
    expect(computeFingerprints([{ bssid: " ", rssi: -70 }])).toEqual([]);
  });
});
