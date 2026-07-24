import { prisma } from "../config/db.js";
import { audit } from "./audit.js";

const dayMs = 24 * 60 * 60_000;

export async function runRetentionCleanup(actorId?: string) {
  const offices = await prisma.office.findMany({
    select: { id: true, name: true, retentionDays: true }
  });
  const now = new Date();
  const officeResults = [];
  let observations = 0;
  let estimates = 0;
  let fingerprintSamples = 0;

  for (const office of offices) {
    const cutoff = new Date(now.getTime() - office.retentionDays * dayMs);
    const [deletedObservations, deletedEstimates, deletedSamples] = await prisma.$transaction([
      prisma.locationObservation.deleteMany({
        where: { officeId: office.id, capturedAt: { lt: cutoff } }
      }),
      prisma.locationEstimate.deleteMany({
        where: { officeId: office.id, observedAt: { lt: cutoff } }
      }),
      prisma.fingerprintSample.deleteMany({
        where: { room: { floor: { officeId: office.id } }, capturedAt: { lt: cutoff } }
      })
    ]);

    observations += deletedObservations.count;
    estimates += deletedEstimates.count;
    fingerprintSamples += deletedSamples.count;
    officeResults.push({
      officeId: office.id,
      officeName: office.name,
      retentionDays: office.retentionDays,
      cutoff,
      observations: deletedObservations.count,
      estimates: deletedEstimates.count,
      fingerprintSamples: deletedSamples.count
    });
  }

  const maxRetentionDays = Math.max(30, ...offices.map(office => office.retentionDays));
  const locationCutoff = new Date(now.getTime() - maxRetentionDays * dayMs);
  const deletedLocations = await prisma.location.deleteMany({
    where: { recordedAt: { lt: locationCutoff } }
  });

  const result = {
    ranAt: now,
    maxRetentionDays,
    locationCutoff,
    totals: {
      observations,
      estimates,
      fingerprintSamples,
      locations: deletedLocations.count
    },
    offices: officeResults
  };

  if (actorId) {
    await audit(actorId, "RETENTION_CLEANUP_RUN", "System", undefined, result);
  }

  return result;
}
