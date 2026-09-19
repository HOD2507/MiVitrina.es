import { PrismaClient } from "./generated/index.js";
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  include: { commercantProfile: true, annonceurProfile: true },
  orderBy: { createdAt: "asc" },
});

console.log("TOTAL USERS:", users.length);
console.log("");
for (const u of users) {
  const label = u.commercantProfile?.businessName ?? u.annonceurProfile?.companyName ?? "(sin perfil de negocio)";
  console.log(`[${u.role}] ${u.email} | ${label} | verified:${u.emailVerified} | created:${u.createdAt.toISOString().slice(0,10)}`);
}

console.log("");
console.log("--- reservations ---");
const reservations = await prisma.reservation.findMany({
  include: {
    space: { include: { commercantProfile: true } },
    annonceurProfile: { include: { user: true } },
  },
});
console.log("TOTAL RESERVATIONS:", reservations.length);
for (const r of reservations) {
  console.log(`${r.id} | status:${r.status} | space:${r.space?.commercantProfile?.businessName} | annonceur:${r.annonceurProfile?.user?.email}`);
}

console.log("");
console.log("--- vitrine spaces ---");
const spaces = await prisma.vitrineSpace.findMany({ include: { commercantProfile: true } });
console.log("TOTAL SPACES:", spaces.length);
for (const s of spaces) {
  console.log(`${s.id} | ${s.commercantProfile?.businessName} | ${s.name}`);
}

await prisma.$disconnect();
