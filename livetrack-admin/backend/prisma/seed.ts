import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  console.log(`Seed skipped. Database contains ${userCount} user(s). Create real users from the dashboard sign-up flow.`);
}

main().finally(() => prisma.$disconnect());
