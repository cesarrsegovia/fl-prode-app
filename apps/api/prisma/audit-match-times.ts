/**
 * CLI: `pnpm db:audit-match-times`
 *
 * Auditoría de SOLO LECTURA: compara el `startTime` de cada partido en la BD
 * contra el horario oficial de ESPN, para detectar desfasajes de zona horaria
 * mal sembrados ANTES de que un partido se muestre/cierre con la hora incorrecta.
 *
 * Matchea por `externalId` (en prod ya es el event id real de ESPN, vía
 * db:map-espn-ids). Para partidos cuyo externalId todavía es sintético
 * (`wc-mXXX`), no puede consultar ESPN por id y los lista como "sin verificar".
 *
 * No modifica nada. Si encuentra desfasajes, sugiere las entradas listas para
 * pegar en prisma/fix-match-times.ts.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';
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

const BASE = (
  process.env.ESPN_SCOREBOARD_URL ||
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
).replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; ProdeBot/1.0)';

/** Hora oficial (ISO UTC) de un evento de ESPN por su id. null si no se halla. */
async function espnStartTime(eventId: string): Promise<string | null> {
  try {
    const res = await axios.get(`${BASE}/scoreboard/${eventId}`, {
      headers: { 'User-Agent': UA },
      timeout: 10_000,
    });
    const date = res.data?.header?.competitions?.[0]?.date ?? res.data?.date;
    return date ? new Date(date).toISOString() : null;
  } catch {
    return null;
  }
}

/** Formatea un instante en hora de Argentina, para lectura humana. */
function ar(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const matches = await prisma.match.findMany({
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        externalId: true,
        homeTeamName: true,
        awayTeamName: true,
        startTime: true,
      },
    });
    console.log(`Auditando ${matches.length} partidos contra ESPN...\n`);

    const mismatches: {
      home: string;
      away: string;
      current: string;
      correct: string;
      deltaH: number;
    }[] = [];
    let ok = 0;
    const unverifiable: string[] = [];

    for (const m of matches) {
      const label = `${m.homeTeamName} vs ${m.awayTeamName}`;
      // Sin event id real de ESPN no podemos verificar por id.
      if (!m.externalId || /^wc-m\d+$/i.test(m.externalId)) {
        unverifiable.push(`${label} (extId ${m.externalId ?? 'null'})`);
        continue;
      }

      const espn = await espnStartTime(m.externalId);
      if (!espn) {
        unverifiable.push(`${label} (extId ${m.externalId}: ESPN no devolvió fecha)`);
        continue;
      }

      const current = m.startTime.toISOString();
      if (current === espn) {
        ok++;
        continue;
      }
      const deltaH =
        (new Date(current).getTime() - new Date(espn).getTime()) / 3_600_000;
      mismatches.push({
        home: m.homeTeamName,
        away: m.awayTeamName,
        current,
        correct: espn,
        deltaH,
      });
    }

    console.log('========== Resultado ==========');
    console.log(`Correctos:      ${ok}`);
    console.log(`Con desfasaje:  ${mismatches.length}`);
    console.log(`Sin verificar:  ${unverifiable.length}`);

    if (mismatches.length) {
      console.log('\n--- DESFASAJES (BD → ESPN) ---');
      for (const x of mismatches) {
        const sign = x.deltaH > 0 ? '+' : '';
        console.log(
          `  ✗ ${x.home} vs ${x.away}\n      BD:    ${x.current} (${ar(x.current)})\n      ESPN:  ${x.correct} (${ar(x.correct)})   [${sign}${x.deltaH}h]`,
        );
      }
      console.log('\n--- Entradas para prisma/fix-match-times.ts ---');
      for (const x of mismatches) {
        const h = x.home.split(/\s+/)[0];
        const a = x.away.split(/\s+/)[0];
        console.log(
          `  { homeContains: '${h}', awayContains: '${a}', correct: '${x.correct}' },`,
        );
      }
    }

    if (unverifiable.length) {
      console.log('\n--- Sin verificar (externalId no es event id de ESPN) ---');
      unverifiable.forEach((u) => console.log(`  ? ${u}`));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗ Error:', (e as Error).message);
  process.exitCode = 1;
});
