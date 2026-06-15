/**
 * CLI: `pnpm db:fix-match-times` (dry-run) | `pnpm db:fix-match-times -- --apply`
 *
 * Corrige el `startTime` de partidos puntuales cuyo horario quedó mal sembrado.
 * Matchea por `externalId` (estable). Por defecto es DRY-RUN: muestra qué
 * cambiaría sin tocar nada; agregá `--apply` para persistir.
 *
 * Idempotente: si el startTime ya coincide con el correcto, no hace nada.
 * No toca scores, status ni picks.
 *
 * Las correcciones viven en la tabla FIXES abajo (valores reales de ESPN).
 * Si aparecen más partidos con horario mal, se agregan ahí.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaService } from '../src/prisma/prisma.service';

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

/**
 * Correcciones de horario, identificadas por substring de los nombres de equipo
 * (home + away) en vez de externalId: en prod el externalId ya fue reemplazado
 * por el event id real de ESPN (db:map-espn-ids), así que el externalId
 * sintético `wc-mXXX` ya no existe. El nombre de equipo es estable.
 * `correct` = startTime real según ESPN (ISO UTC).
 */
interface Fix {
  homeContains: string;
  awayContains: string;
  correct: string;
}
const FIXES: Fix[] = [
  // SWE vs TUN: real 2026-06-15T02:00Z (estaba 2026-06-16T01:00Z, −23h).
  { homeContains: 'Suecia', awayContains: 'nez', correct: '2026-06-15T02:00:00.000Z' },
  // IRN vs NZL: real 2026-06-16T01:00Z (estaba 2026-06-16T04:00Z, −3h).
  { homeContains: 'Ir', awayContains: 'Zelanda', correct: '2026-06-16T01:00:00.000Z' },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    console.log(apply ? '== APLICANDO cambios ==' : '== DRY-RUN (usá --apply para persistir) ==\n');

    let changed = 0;
    let alreadyOk = 0;
    let notFound = 0;

    for (const fix of FIXES) {
      const matches = await prisma.match.findMany({
        where: {
          homeTeamName: { contains: fix.homeContains, mode: 'insensitive' },
          awayTeamName: { contains: fix.awayContains, mode: 'insensitive' },
        },
        select: {
          id: true,
          externalId: true,
          homeTeamName: true,
          awayTeamName: true,
          startTime: true,
        },
      });

      const wanted = `${fix.homeContains}/${fix.awayContains}`;
      if (matches.length === 0) {
        console.log(`  ? ${wanted}: no se encontró el partido — skip`);
        notFound++;
        continue;
      }
      if (matches.length > 1) {
        console.log(
          `  ! ${wanted}: ${matches.length} partidos coinciden — ambiguo, NO se toca. Revisar:`,
        );
        matches.forEach((m) =>
          console.log(`      ${m.homeTeamName} vs ${m.awayTeamName} (extId ${m.externalId})`),
        );
        notFound++;
        continue;
      }

      const match = matches[0];
      const current = match.startTime.toISOString();
      const correct = new Date(fix.correct).toISOString();
      const label = `${match.homeTeamName} vs ${match.awayTeamName} (extId ${match.externalId})`;

      if (current === correct) {
        console.log(`  = ${label}: ya correcto (${correct})`);
        alreadyOk++;
        continue;
      }

      console.log(`  ${apply ? '✓' : '→'} ${label}: ${current}  →  ${correct}`);
      if (apply) {
        await prisma.match.update({
          where: { id: match.id },
          data: { startTime: new Date(fix.correct) },
        });
      }
      changed++;
    }

    console.log('\n========== Resumen ==========');
    console.log(`A corregir:   ${changed}`);
    console.log(`Ya correctos: ${alreadyOk}`);
    console.log(`No hallados:  ${notFound}`);
    if (!apply && changed > 0) {
      console.log('\nNada se modificó (dry-run). Corré con `--apply` para persistir.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗ Error:', (e as Error).message);
  process.exitCode = 1;
});
