import { PrismaClient } from "./generated/index.js";
const prisma = new PrismaClient();
const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
for (const a of admins) {
  console.log(a.email, "| verified:", a.emailVerified, "| suspended:", a.suspended, "| created:", a.createdAt);
}
console.log("total admins:", admins.length);
await prisma.$disconnect();
