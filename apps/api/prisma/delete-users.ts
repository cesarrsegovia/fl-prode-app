/**
 * CLI: `DELETE_USER_IDS=id1,id2,... pnpm db:delete-users`
 *
 * Borra usuarios y TODAS sus filas dependientes en una sola transacción
 * (todo o nada). Pensado para limpiar cuentas de registro local/propio (Vercel).
 *
 * Salvaguardas:
 *   - Los IDs se pasan explícitos por env DELETE_USER_IDS (no hay borrado masivo
 *     por criterio: hay que nombrar a cada usuario).
 *   - Antes de borrar, re-verifica DENTRO de la transacción que cada usuario
 *     exista, NO sea provider (providerName debe ser null) y NO sea admin.
 *     Si alguno no cumple, aborta toda la transacción sin tocar nada.
 *   - Por defecto hace un DRY-RUN (solo informa). Para ejecutar de verdad hay
 *     que pasar CONFIRM=1.
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
  const ids = (process.env.DELETE_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!ids.length) {
    console.error('Falta DELETE_USER_IDS=id1,id2,...');
    process.exit(1);
  }

  const confirm = process.env.CONFIRM === '1';
  const host = (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':***@');
  console.log(`\nDB: ${host}`);
  console.log(`Modo: ${confirm ? 'EJECUTAR (CONFIRM=1)' : 'DRY-RUN (sin CONFIRM=1)'}`);
  console.log(`IDs solicitados (${ids.length}): ${ids.join(', ')}\n`);

  await prisma.$transaction(
    async (tx) => {
    // Salvaguarda: validar a quién estamos por borrar.
    const users = await tx.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        email: true,
        username: true,
        providerName: true,
        isAdmin: true,
      },
    });

    const found = new Set(users.map((u) => u.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) {
      throw new Error(`IDs inexistentes, abortando: ${missing.join(', ')}`);
    }
    const providers = users.filter((u) => u.providerName != null);
    if (providers.length) {
      throw new Error(
        `Hay usuarios de provider en la lista, abortando: ${providers
          .map((u) => u.id)
          .join(', ')}`,
      );
    }
    const admins = users.filter((u) => u.isAdmin);
    if (admins.length) {
      throw new Error(
        `Hay admins en la lista, abortando: ${admins.map((u) => u.id).join(', ')}`,
      );
    }

    console.log('Usuarios a borrar:');
    for (const u of users) {
      console.log(`  ${u.id}  ${u.email ?? '(sin email)'}  @${u.username ?? '?'}`);
    }

    const where = { userId: { in: ids } };

    // Orden: primero todas las dependientes, luego el User.
    const r1 = await tx.message.deleteMany({ where });
    const r2 = await tx.activity.deleteMany({ where });
    const r3 = await tx.notification.deleteMany({ where });
    const r4 = await tx.userAchievement.deleteMany({ where });
    const r5 = await tx.r32QualifierPick.deleteMany({ where });
    const r6 = await tx.topScorerPick.deleteMany({ where });
    const r7 = await tx.bracketPick.deleteMany({ where });
    const r8 = await tx.prediction.deleteMany({ where });
    const r9 = await tx.userScore.deleteMany({ where });
    const r10 = await tx.groupMember.deleteMany({ where });
    const r11 = await tx.providerSession.deleteMany({ where });
    const r12 = await tx.walletTransaction.deleteMany({ where });
    const r13 = await tx.tournamentEntry.deleteMany({ where });
    const ru = await tx.user.deleteMany({ where: { id: { in: ids } } });

    console.log('\nFilas borradas:');
    console.log(`  message:           ${r1.count}`);
    console.log(`  activity:          ${r2.count}`);
    console.log(`  notification:      ${r3.count}`);
    console.log(`  userAchievement:   ${r4.count}`);
    console.log(`  r32QualifierPick:  ${r5.count}`);
    console.log(`  topScorerPick:     ${r6.count}`);
    console.log(`  bracketPick:       ${r7.count}`);
    console.log(`  prediction:        ${r8.count}`);
    console.log(`  userScore:         ${r9.count}`);
    console.log(`  groupMember:       ${r10.count}`);
    console.log(`  providerSession:   ${r11.count}`);
    console.log(`  walletTransaction: ${r12.count}`);
    console.log(`  tournamentEntry:   ${r13.count}`);
    console.log(`  user:              ${ru.count}`);

    if (!confirm) {
      throw new Error('DRY-RUN: revirtiendo. Pasá CONFIRM=1 para ejecutar de verdad.');
    }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  console.log('\n✅ Transacción confirmada. Usuarios eliminados.\n');
}

main()
  .catch((e) => {
    console.error(`\n${e.message ?? e}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
