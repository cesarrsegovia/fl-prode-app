import { PrismaClient, MatchStatus } from '@prisma/client';
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
];

const TEAMS = [
  'River Plate',
  'Boca Juniors',
  'Racing Club',
  'Independiente',
  'San Lorenzo',
  'Huracán',
  'Estudiantes',
  'Gimnasia LP',
  'Vélez Sarsfield',
  'Lanús',
  'Argentinos Juniors',
  'Talleres',
  'Belgrano',
  'Rosario Central',
  'Newell\'s Old Boys',
  'Defensa y Justicia',
];

interface MatchSeed {
  home: string;
  away: string;
  startOffsetHours: number;
}

function buildRound(teams: string[], roundIndex: number): MatchSeed[] {
  const pairs: MatchSeed[] = [];
  const shuffled = [...teams];
  const rotation = roundIndex % (shuffled.length - 1);
  const rotated = [shuffled[0], ...shuffled.slice(1 + rotation), ...shuffled.slice(1, 1 + rotation)];
  const half = rotated.length / 2;
  for (let i = 0; i < half; i++) {
    const home = roundIndex % 2 === 0 ? rotated[i] : rotated[rotated.length - 1 - i];
    const away = roundIndex % 2 === 0 ? rotated[rotated.length - 1 - i] : rotated[i];
    pairs.push({
      home,
      away,
      startOffsetHours: i * 3,
    });
  }
  return pairs;
}

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

async function seedSeasonAndFixtures() {
  const seasonName = 'Liga Profesional 2025';

  let season = await prisma.season.findFirst({ where: { name: seasonName } });
  if (!season) {
    season = await prisma.season.create({
      data: { name: seasonName, isActive: true },
    });
  } else if (!season.isActive) {
    season = await prisma.season.update({
      where: { id: season.id },
      data: { isActive: true },
    });
  }

  await prisma.season.updateMany({
    where: { id: { not: season.id }, isActive: true },
    data: { isActive: false },
  });

  const totalRounds = 5;
  const now = new Date();

  for (let round = 1; round <= totalRounds; round++) {
    const daysFromNow = (round - 1) * 7 - 7;
    const kickoff = new Date(now);
    kickoff.setDate(kickoff.getDate() + daysFromNow);
    kickoff.setHours(15, 30, 0, 0);

    const closeAt = new Date(kickoff);

    const matchesData = buildRound(TEAMS, round - 1);

    const existing = await prisma.fixture.findUnique({
      where: { seasonId_round: { seasonId: season.id, round } },
      include: { matches: true },
    });

    if (existing) {
      if (existing.matches.length > 0) continue;
      await prisma.match.createMany({
        data: matchesData.map((m) => {
          const start = new Date(kickoff);
          start.setHours(start.getHours() + m.startOffsetHours);
          const status: MatchStatus =
            daysFromNow < -2 ? MatchStatus.FINISHED : MatchStatus.PENDING;
          const homeScore = status === MatchStatus.FINISHED ? Math.floor(Math.random() * 4) : null;
          const awayScore = status === MatchStatus.FINISHED ? Math.floor(Math.random() * 4) : null;
          return {
            fixtureId: existing.id,
            homeTeam: m.home,
            awayTeam: m.away,
            startTime: start,
            status,
            homeScore,
            awayScore,
          };
        }),
      });
      continue;
    }

    await prisma.fixture.create({
      data: {
        seasonId: season.id,
        round,
        closeAt,
        matches: {
          create: matchesData.map((m) => {
            const start = new Date(kickoff);
            start.setHours(start.getHours() + m.startOffsetHours);
            const status: MatchStatus =
              daysFromNow < -2 ? MatchStatus.FINISHED : MatchStatus.PENDING;
            const homeScore = status === MatchStatus.FINISHED ? Math.floor(Math.random() * 4) : null;
            const awayScore = status === MatchStatus.FINISHED ? Math.floor(Math.random() * 4) : null;
            return {
              homeTeam: m.home,
              awayTeam: m.away,
              startTime: start,
              status,
              homeScore,
              awayScore,
            };
          }),
        },
      },
    });
  }

  const fixtureCount = await prisma.fixture.count({ where: { seasonId: season.id } });
  const matchCount = await prisma.match.count({
    where: { fixture: { seasonId: season.id } },
  });
  console.log(`✓ Temporada "${seasonName}": ${fixtureCount} fechas, ${matchCount} partidos`);
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
  console.log('Sembrando base de datos...');
  await seedAchievements();
  await seedAdminUser();
  await seedSeasonAndFixtures();
  console.log('Listo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
