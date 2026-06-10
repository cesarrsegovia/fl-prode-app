/**
 * CLI: `pnpm db:seed-squads`
 * Siembra los planteles del Mundial 2026 desde
 * apps/api/prisma/data/mundial2026_planteles.json (listas oficiales por
 * selección). Idempotente. Requiere el Mundial ya sembrado (db:seed-worldcup).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { SquadSeederService } from '../src/modules/importer/squad-seeder.service';

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
  const seeder = new SquadSeederService(prisma);

  console.log('Sembrando planteles del Mundial 2026...');
  try {
    const summary = await seeder.seed();
    console.log('\n========== Resumen ==========');
    console.log(`Tournament ID:    ${summary.tournamentId}`);
    console.log(`Selecciones:      ${summary.teamsMatched}`);
    console.log(`Jugadores:        ${summary.playersImported}`);
    console.log(`Squad entries:    ${summary.squadEntries}`);
    console.log(`Fotos vinculadas: ${summary.photosMatched}`);
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
