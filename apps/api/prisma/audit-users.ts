/**
 * CLI: `pnpm db:audit-users`
 *
 * Diagnóstico de SOLO LECTURA. Clasifica los usuarios en dos grupos para decidir
 * un borrado seguro:
 *
 *   - "provider": entraron vía la plataforma padre (providerName seteado).
 *     Estos se CONSERVAN.
 *   - "local": registro propio desde el frontend (Vercel), sin providerName.
 *     Estos son los candidatos a ELIMINAR.
 *
 * Para cada grupo cuenta usuarios y sus filas dependientes (memberships,
 * predictions, scores, etc.), para saber qué se borraría en cascada ANTES de
 * tocar nada. No modifica la base.
 *
 * DATABASE_URL se toma del entorno; si no está, cae al .env local.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* .env opcional */
  }
}
loadEnvFile(resolve(process.cwd(), '.env'));

const prisma = new PrismaClient();

async function main() {
  const host = (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':***@');
  console.log(`\nDB: ${host}\n`);

  const all = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      passwordHash: true,
      providerName: true,
      providerUserId: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const provider = all.filter((u) => u.providerName != null);
  const local = all.filter((u) => u.providerName == null);

  console.log(`Total usuarios: ${all.length}`);
  console.log(`  CONSERVAR (provider, providerName != null): ${provider.length}`);
  console.log(`  CANDIDATOS A BORRAR (local, providerName == null): ${local.length}\n`);

  console.log('--- Candidatos a borrar (local/Vercel) ---');
  for (const u of local) {
    const flags = [
      u.isAdmin ? 'ADMIN' : '',
      u.passwordHash ? 'pwd' : 'sin-pwd',
    ]
      .filter(Boolean)
      .join(' ');
    console.log(
      `  ${u.id}  ${u.email ?? '(sin email)'}  @${u.username ?? '?'}  ${flags}  ${u.createdAt.toISOString().slice(0, 10)}`,
    );
  }

  // Filas dependientes de los candidatos a borrar, para dimensionar la cascada.
  const ids = local.map((u) => u.id);
  if (ids.length) {
    const where = { userId: { in: ids } };
    const [
      memberships,
      scores,
      predictions,
      bracketPicks,
      topScorerPicks,
      r32Picks,
      notifications,
      achievements,
      activities,
      messages,
      providerSessions,
      walletTxs,
      tournamentEntries,
    ] = await Promise.all([
      prisma.groupMember.count({ where }),
      prisma.userScore.count({ where }),
      prisma.prediction.count({ where }),
      prisma.bracketPick.count({ where }),
      prisma.topScorerPick.count({ where }),
      prisma.r32QualifierPick.count({ where }),
      prisma.notification.count({ where }),
      prisma.userAchievement.count({ where }),
      prisma.activity.count({ where }),
      prisma.message.count({ where }),
      prisma.providerSession.count({ where }),
      prisma.walletTransaction.count({ where }),
      prisma.tournamentEntry.count({ where }),
    ]);

    console.log('\n--- Filas dependientes que se borrarían en cascada ---');
    console.log(`  groupMember:       ${memberships}`);
    console.log(`  userScore:         ${scores}`);
    console.log(`  prediction:        ${predictions}`);
    console.log(`  bracketPick:       ${bracketPicks}`);
    console.log(`  topScorerPick:     ${topScorerPicks}`);
    console.log(`  r32QualifierPick:  ${r32Picks}`);
    console.log(`  notification:      ${notifications}`);
    console.log(`  userAchievement:   ${achievements}`);
    console.log(`  activity:          ${activities}`);
    console.log(`  message:           ${messages}`);
    console.log(`  providerSession:   ${providerSessions}`);
    console.log(`  walletTransaction: ${walletTxs}`);
    console.log(`  tournamentEntry:   ${tournamentEntries}`);
  }

  console.log('\n(Solo lectura: no se modificó nada.)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
