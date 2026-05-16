import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@prode.local';
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';

const ACHIEVEMENTS = [
  {
    key: 'FIRST_PREDICTION',
    name: 'Debut',
    description: 'Cargá tu primer pronóstico.',
  },
  {
    key: 'EXACT_SCORE',
    name: 'Ojo de Halcón',
    description: 'Acertá un marcador exacto.',
  },
  {
    key: 'STREAK_5',
    name: 'En Racha',
    description: 'Alcanzá una racha de 5 aciertos seguidos.',
  },
  {
    key: 'STREAK_10',
    name: 'Imparable',
    description: 'Alcanzá una racha de 10 aciertos seguidos.',
  },
  {
    key: 'PERFECT_ROUND',
    name: 'Fecha Perfecta',
    description: 'Acertá todos los partidos de una fecha.',
  },
  {
    key: 'BRACKET_CHAMPION',
    name: 'Visionario',
    description: 'Acertaste el campeón del torneo.',
  },
];

async function seedAchievements() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: { name: a.name, description: a.description },
      create: a,
    });
  }
  console.log(`✓ ${ACHIEVEMENTS.length} achievements listos`);
}

async function seedAdminUser() {
  const passwordHash = await hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { isAdmin: true },
    create: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      passwordHash,
      isAdmin: true,
    },
  });
  console.log(`✓ Admin: ${ADMIN_EMAIL} (pw: ${ADMIN_PASSWORD})`);
}

async function main() {
  console.log('Sembrando base mínima...');
  await seedAchievements();
  await seedAdminUser();
  console.log('Listo. Para importar el Mundial 2026: pnpm db:import-worldcup');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
