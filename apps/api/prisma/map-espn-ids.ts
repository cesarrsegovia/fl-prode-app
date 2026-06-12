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

    const espnByKey = new Map<string, EspnEvent>();
    for (const e of espn) {
      if (e.homeAbbr && e.awayAbbr) {
        espnByKey.set(`${norm(e.homeAbbr)}|${norm(e.awayAbbr)}|${ymd(new Date(e.dateIso))}`, e);
      }
    }

    let matched = 0;
    const unmatched: string[] = [];

    for (const m of matches) {
      let ev: EspnEvent | undefined;
      if (m.stage === MatchStage.GROUP && m.homeTeam && m.awayTeam) {
        const key = `${norm(m.homeTeam.shortName)}|${norm(m.awayTeam.shortName)}|${ymd(m.startTime)}`;
        ev = espnByKey.get(key);
      } else {
        ev = espn.find((e) => new Date(e.dateIso).getTime() === m.startTime.getTime());
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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗ Error:', (e as Error).message);
  process.exitCode = 1;
});
