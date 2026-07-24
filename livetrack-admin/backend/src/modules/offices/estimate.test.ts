import { describe, expect, it } from "vitest";
import { distanceMeters, estimateRoom, smoothReadings, stabilizeRoomEstimate } from "./estimate.js";

describe("office room estimate", () => {
  it("selects the strongest matching room and confidence status", () => {
    const estimate = estimateRoom([
      { bssid: "aa:bb", rssi: -51 },
      { bssid: "cc:dd", rssi: -59 }
    ], [
      { officeId: "office-1", floorId: "floor-1", roomId: "meeting", fingerprints: [{ bssid: "aa:bb", rssiMean: -50 }, { bssid: "cc:dd", rssiMean: -60 }] },
      { officeId: "office-1", floorId: "floor-1", roomId: "kitchen", fingerprints: [{ bssid: "aa:bb", rssiMean: -80 }] }
    ]);

    expect(estimate).toMatchObject({ roomId: "meeting", status: "CONFIRMED" });
    expect(estimate!.confidence).toBeGreaterThan(0.9);
  });

  it("returns no estimate without shared BSSID fingerprints", () => {
    expect(estimateRoom([{ bssid: "aa", rssi: -60 }], [{ officeId: "o", floorId: "f", roomId: "r", fingerprints: [{ bssid: "bb", rssiMean: -60 }] }])).toBeUndefined();
  });

  it("penalizes small profiles when the scan has stronger coverage for another room", () => {
    const estimate = estimateRoom([
      { bssid: "aa", rssi: -44 },
      { bssid: "bb", rssi: -55 },
      { bssid: "cc", rssi: -63 },
      { bssid: "dd", rssi: -72 }
    ], [
      {
        officeId: "office-1",
        floorId: "floor-1",
        roomId: "small-room",
        fingerprints: [
          { bssid: "aa", rssiMean: -44, sampleCount: 3 },
          { bssid: "bb", rssiMean: -55, sampleCount: 3 }
        ]
      },
      {
        officeId: "office-1",
        floorId: "floor-1",
        roomId: "covered-room",
        fingerprints: [
          { bssid: "aa", rssiMean: -45, sampleCount: 3 },
          { bssid: "bb", rssiMean: -56, sampleCount: 3 },
          { bssid: "cc", rssiMean: -62, sampleCount: 3 },
          { bssid: "dd", rssiMean: -73, sampleCount: 3 }
        ]
      }
    ]);

    expect(estimate).toMatchObject({ roomId: "covered-room" });
  });

  it("downgrades close room matches instead of confirming an ambiguous room", () => {
    const estimate = estimateRoom([
      { bssid: "aa", rssi: -43 },
      { bssid: "bb", rssi: -55 },
      { bssid: "cc", rssi: -69 }
    ], [
      {
        officeId: "office-1",
        floorId: "floor-1",
        roomId: "room-a",
        fingerprints: [
          { bssid: "aa", rssiMean: -42, sampleCount: 3 },
          { bssid: "bb", rssiMean: -56, sampleCount: 3 },
          { bssid: "cc", rssiMean: -70, sampleCount: 3 }
        ]
      },
      {
        officeId: "office-1",
        floorId: "floor-1",
        roomId: "room-b",
        fingerprints: [
          { bssid: "aa", rssiMean: -45, sampleCount: 3 },
          { bssid: "bb", rssiMean: -57, sampleCount: 3 },
          { bssid: "cc", rssiMean: -71, sampleCount: 3 }
        ]
      }
    ]);

    expect(estimate).toMatchObject({ roomId: "room-a", status: "NEAR" });
    expect(estimate!.confidence).toBeLessThan(0.68);
  });

  it("smooths repeated readings by BSSID median", () => {
    expect(smoothReadings([
      [{ bssid: "AA", rssi: -50 }, { bssid: "BB", rssi: -70 }],
      [{ bssid: "aa", rssi: -56 }],
      [{ bssid: "aa", rssi: -52 }]
    ])).toEqual(expect.arrayContaining([
      { bssid: "aa", rssi: -52 },
      { bssid: "bb", rssi: -70 }
    ]));
  });

  it("downgrades a sudden room switch until the new room repeats", () => {
    const observedAt = new Date("2026-07-24T17:00:30.000Z");
    const candidate = {
      officeId: "office-1",
      floorId: "floor-1",
      roomId: "room-b",
      confidence: 0.84,
      status: "PROBABLE" as const
    };

    const firstSwitch = stabilizeRoomEstimate(candidate, [{
      roomId: "room-a",
      confidence: 0.86,
      status: "CONFIRMED",
      observedAt: new Date("2026-07-24T17:00:10.000Z")
    }], observedAt);
    expect(firstSwitch).toMatchObject({ roomId: "room-b", status: "NEAR" });
    expect(firstSwitch!.confidence).toBeLessThan(candidate.confidence);

    const repeatedSwitch = stabilizeRoomEstimate(candidate, [{
      roomId: "room-b",
      confidence: 0.66,
      status: "NEAR",
      observedAt: new Date("2026-07-24T17:00:20.000Z")
    }, {
      roomId: "room-a",
      confidence: 0.86,
      status: "CONFIRMED",
      observedAt: new Date("2026-07-24T17:00:10.000Z")
    }], observedAt);
    expect(repeatedSwitch).toMatchObject({ roomId: "room-b", status: "PROBABLE", confidence: 0.84 });
  });

  it("calculates short geofence distances", () => {
    expect(distanceMeters({ latitude: 31.5, longitude: 74.3 }, { latitude: 31.5005, longitude: 74.3 })).toBeLessThan(70);
  });
});
