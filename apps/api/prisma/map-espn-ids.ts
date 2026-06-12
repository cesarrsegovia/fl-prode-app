/**
 * CLI: `pnpm db:map-espn-ids`
 * Pobla Match.externalId con el event id real de ESPN para el Mundial 2026.
 * - Grupos: matchea por (abbr home + abbr away + fecha UTC).
 * - KO: matchea por (fecha UTC + hora exacta) — ESPN usa placeholders con la misma fecha.
 * Idempotente. No toca picks/scores. Loguea los partidos sin match.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';
import { MatchStage } from '@prisma/client';
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* .env opcional */
  }
}
loadEnvFile(resolve(process.cwd(), '.env'));

const BASE =
  (process.env.ESPN_SCOREBOARD_URL ||
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; ProdeBot/1.0)';

interface EspnEvent {
  id: string;
  dateIso: string;
  homeAbbr: string | null;
  awayAbbr: string | null;
}

function norm(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function* dateRange(start: Date, end: Date): Generator<string> {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (d <= last) {
    yield ymd(d);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function fetchEspnEvents(dates: string[]): Promise<EspnEvent[]> {
  const out: EspnEvent[] = [];
  for (const date of dates) {
    try {
      const res = await axios.get(`${BASE}/scoreboard`, {
        params: { dates: date },
        headers: { 'User-Agent': UA },
        timeout: 10_000,
      });
      for (const ev of res.data?.events ?? []) {
        const competitors = ev?.competitions?.[0]?.competitors ?? [];
        const home = competitors.find((c: any) => c?.homeAway === 'home');
        const away = competitors.find((c: any) => c?.homeAway === 'away');
        out.push({
          id: String(ev.id),
          dateIso: ev.date,
          homeAbbr: home?.team?.abbreviation ?? null,
          awayAbbr: away?.team?.abbreviation ?? null,
        });
      }
    } catch (err: any) {
      console.warn(`  ! ESPN ${date}: ${err.message}`);
    }
  }
  return out;
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const tournament = await prisma.tournament.findFirst({ orderBy: { startDate: 'asc' } });
    if (!tournament) throw new Error('No hay torneo sembrado.');
    if (!tournament.startDate || !tournament.endDate) {
      throw new Error('El torneo no tiene startDate/endDate; no se puede recorrer el rango de fechas.');
    }

    const matches = await prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: { homeTeam: true, awayTeam: true },
    });

    const dates = Array.from(dateRange(tournament.startDate, tournament.endDate));
    console.log(`Trayendo eventos de ESPN para ${dates.length} fechas...`);
    const espn = await fetchEspnEvents(dates);
    console.log(`ESPN devolvió ${espn.length} eventos.`);

    // Índice de eventos de grupos por PAR de equipos sin orden (clave canónica).
    // Cada clave puede tener varios eventos (distintas fechas); el match elige el más cercano.
    const pairKey = (a: string, b: string) => [norm(a), norm(b)].sort().join('|');
    const espnByPair = new Map<string, EspnEvent[]>();
    for (const e of espn) {
      if (e.homeAbbr && e.awayAbbr) {
        const k = pairKey(e.homeAbbr, e.awayAbbr);
        (espnByPair.get(k) ?? espnByPair.set(k, []).get(k)!).push(e);
      }
    }

    const DAY_MS = 24 * 60 * 60 * 1000;

    let matched = 0;
    const unmatched: string[] = [];
    const inverted: string[] = [];

    for (const m of matches) {
      let ev: EspnEvent | undefined;
      if (m.stage === MatchStage.GROUP && m.homeTeam?.shortName && m.awayTeam?.shortName) {
        // Match por par sin orden + tolerancia de fecha ±1 día (huso horario).
        const candidates = espnByPair.get(pairKey(m.homeTeam.shortName, m.awayTeam.shortName)) ?? [];
        ev = candidates
          .filter((c) => Math.abs(new Date(c.dateIso).getTime() - m.startTime.getTime()) <= DAY_MS)
          .sort(
            (a, b) =>
              Math.abs(new Date(a.dateIso).getTime() - m.startTime.getTime()) -
              Math.abs(new Date(b.dateIso).getTime() - m.startTime.getTime()),
          )[0];
        // Detectar invertido (ESPN home != nuestro home) para alertar — NO tocamos home/away.
        if (ev && norm(ev.homeAbbr) !== norm(m.homeTeam.shortName)) {
          inverted.push(
            `${m.homeTeam.shortName} vs ${m.awayTeam.shortName} (ESPN: ${ev.homeAbbr} vs ${ev.awayAbbr}, id ${ev.id})`,
          );
        }
      } else {
        // KO: placeholders en ambos lados → match por fecha+hora con tolerancia ±1 día.
        ev = espn
          .filter((e) => Math.abs(new Date(e.dateIso).getTime() - m.startTime.getTime()) <= DAY_MS)
          .sort(
            (a, b) =>
              Math.abs(new Date(a.dateIso).getTime() - m.startTime.getTime()) -
              Math.abs(new Date(b.dateIso).getTime() - m.startTime.getTime()),
          )[0];
      }
      if (ev) {
        await prisma.match.update({ where: { id: m.id }, data: { externalId: ev.id } });
        matched++;
      } else {
        const label =
          m.stage === MatchStage.GROUP
            ? `${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName}`
            : `${m.homeTeamName} vs ${m.awayTeamName}`;
        unmatched.push(`${m.stage} ${label} @ ${m.startTime.toISOString()}`);
      }
    }

    console.log('\n========== Resumen ==========');
    console.log(`Partidos en BD:   ${matches.length}`);
    console.log(`Mapeados:         ${matched}`);
    console.log(`Sin match:        ${unmatched.length}`);
    if (unmatched.length) {
      console.log('\nSin match (revisar a mano):');
      unmatched.forEach((u) => console.log(`  - ${u}`));
    }
    if (inverted.length) {
      console.log(
        '\n⚠️  Invertidos (ESPN tiene home/away al revés que la BD — el score podría venir invertido, revisar):',
      );
      inverted.forEach((u) => console.log(`  - ${u}`));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗ Error:', (e as Error).message);
  process.exitCode = 1;
});
