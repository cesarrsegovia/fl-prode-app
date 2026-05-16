/**
 * CLI: `pnpm db:import-worldcup`
 * Importa el Mundial 2026 desde API-Football. Idempotente.
 *
 * Variables de entorno necesarias:
 *   SPORTS_API_KEY  → key de api-sports.io
 *   SPORTS_API_URL  → https://v3.football.api-sports.io
 *
 * Flags por env:
 *   IMPORT_SQUADS=1 → también baja plantillas (suma ~48 requests).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { WorldCupImporterService } from '../src/modules/importer/worldcup-importer.service';

// Carga .env manual (sin depender de dotenv).
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

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const importer = new WorldCupImporterService(prisma);

  const withSquads = process.env.IMPORT_SQUADS === '1';
  console.log(
    `Importando Mundial 2026 ${withSquads ? '(con plantillas)' : '(sin plantillas)'}...`,
  );

  try {
    const summary = await importer.importWorldCup2026({ withSquads });
    console.log('\n========== Resumen ==========');
    console.log(`Tournament ID:    ${summary.tournamentId}`);
    console.log(`Equipos:          ${summary.teamsImported}`);
    console.log(`Grupos:           ${summary.groupsImported}`);
    console.log(`Estadios:         ${summary.venuesImported}`);
    console.log(`Fixtures:         ${summary.fixturesImported}`);
    console.log(`Partidos:         ${summary.matchesImported}`);
    console.log(`Jugadores:        ${summary.playersImported}`);
    console.log(`Requests usadas:  ${summary.apiRequestsUsed}`);
    if (summary.warnings.length) {
      console.log('\nAdvertencias:');
      summary.warnings.forEach((w) => console.log(`  - ${w}`));
    }
  } catch (err) {
    console.error('\n✗ Error:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
