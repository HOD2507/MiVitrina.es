/**
 * Seed de bootstrap : crée le compte administrateur initial.
 *
 * L'inscription publique (`POST /api/auth/register`) n'accepte jamais
 * le rôle ADMIN — c'est le seul moyen de créer un admin.
 *
 * Variables d'environnement requises : ADMIN_EMAIL, ADMIN_PASSWORD.
 * Usage : pnpm --filter @mivitrina/database exec prisma db seed
 */
const bcrypt = require("bcrypt");
const { PrismaClient } = require("../generated");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "[seed] ADMIN_EMAIL / ADMIN_PASSWORD non définis dans l'environnement : " +
        "aucun compte admin créé. Voir .env.example.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Un utilisateur existe déjà pour ${email} (rôle: ${existing.role}), rien à faire.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  console.log(`[seed] Compte admin créé : ${admin.email} (id: ${admin.id})`);

  await prisma.platformSettings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
  console.log("[seed] PlatformSettings initialisé (commission par défaut : 15%).");
}

main()
  .catch((e) => {
    console.error("[seed] Échec :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
