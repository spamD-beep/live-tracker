import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoLocations = await prisma.location.deleteMany({
    where: { clientLocationId: { startsWith: "seed-" } }
  });
  const demoDevices = await prisma.device.deleteMany({
    where: { deviceUuid: { startsWith: "demo-device-" } }
  });
  const demoUsers = await prisma.user.deleteMany({
    where: { email: { in: ["admin@livetrack.test", "viewer@livetrack.test"] } }
  });

  console.log(`Removed ${demoUsers.count} demo user(s), ${demoDevices.count} demo device(s), and ${demoLocations.count} demo location(s).`);
}

main().finally(() => prisma.$disconnect());
