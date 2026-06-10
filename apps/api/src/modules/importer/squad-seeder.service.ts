import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Sembrador estático de planteles del Mundial 2026.
 * Lee apps/api/prisma/data/mundial2026_planteles.json (listas oficiales por
 * selección) y hace upserts idempotentes de Player + SquadEntry contra el
 * torneo activo. No usa API externa.
 *
 * - Excluye cuerpo técnico (entrenador, asistente, DT): solo jugadores.
 * - Repara el mojibake del archivo (UTF-8 leído como Latin-1).
 * - Mapea cada `pais` a un Team existente por nombre normalizado.
 *
 * Idempotente: re-ejecutar no duplica nada.
 */

interface RawPlayer {
  nombre: string;
  posicion: string;
  club: string;
  pais: string;
}

interface RawSeleccion {
  pais: string;
  total_jugadores: number;
  jugadores: RawPlayer[];
}

interface RawData {
  mundial: string;
  fecha_extraccion: string;
  fuente: string;
  total_selecciones: number;
  selecciones: RawSeleccion[];
}

export interface SquadSeedSummary {
  tournamentId: string;
  teamsMatched: number;
  playersImported: number;
  squadEntries: number;
  photosMatched: number;
  warnings: string[];
}

export interface SquadSeedOptions {
  /** Ruta al JSON de planteles. */
  dataPath?: string;
  /**
   * Carpeta raíz de las fotos (apps/web/public/players por defecto), con
   * subcarpetas por país. Si no existe, se omite el seteo de photoUrl.
   */
  photosDir?: string;
  /**
   * Prefijo público con el que se sirven las fotos en la web.
   * "/players" => photoUrl = "/players/Argentina/Lionel_Messi_Argentina.png".
   */
  photosPublicBase?: string;
}

// Posiciones del cuerpo técnico que NO son jugadores.
const STAFF_POSITIONS = [
  'entrenador',
  'asistente tecnico',
  'director tecnico',
  'director técnico',
];

/**
 * Alias para nombres que el mojibake del JSON dañó de forma irreversible
 * (transformó letras, no solo las borró), de modo que ni el match exacto ni el
 * fallback por subsecuencia los resuelven. Clave: nameKey del nombre corrupto;
 * valor: nombre correcto. Se aplica antes del matching de foto, así vincula la
 * imagen y corrige el nombre en la BD.
 */
const NAME_ALIASES: Record<string, string> = {
  // Croacia (clave = nameKey del nombre corrupto del JSON)
  josipstaniai: 'Josip Stanišić', // "Josip Staniai"
  lukavuakovi: 'Luka Vušković', // "Luka Vuakovi"
  nikolavlaai: 'Nikola Vlašić', // "Nikola Vlaai"
  // Republica Checa
  jindyichstank: 'Jindřich Staněk', // "JindYich Stank"
  tomasholea: 'Tomáš Holeš', // "Tomas Holea"
  hugosochorek: 'Hugo Sochůrek', // "Hugo Sochorek"
  // Bosnia
  ivanbaai: 'Ivan Bašić', // "Ivan Baai"
};

// Mapeo de posiciones en español del archivo -> categoría del schema
// ("Goalkeeper" | "Defender" | "Midfielder" | "Attacker").
function normalizePosition(posEs: string): string | undefined {
  const p = stripAccents(posEs.toLowerCase());
  if (p.includes('portero')) return 'Goalkeeper';
  if (p.includes('defensa')) return 'Defender';
  if (
    p.includes('mediocampista') ||
    p.includes('centrocampista') ||
    p.includes('volante')
  )
    return 'Midfielder';
  if (p.includes('delantero')) return 'Attacker';
  return undefined;
}

function isStaff(posEs: string): boolean {
  const p = stripAccents(posEs.toLowerCase()).trim();
  return STAFF_POSITIONS.some((s) => p === stripAccents(s));
}

/**
 * Repara mojibake: bytes UTF-8 que fueron decodificados como Latin-1.
 * "AtlÃ©tico" -> "Atlético", "GerÃ³nimo" -> "Gerónimo".
 */
function fixMojibake(s: string): string {
  try {
    const repaired = Buffer.from(s, 'latin1').toString('utf8');
    // Si la reparación introdujo el carácter de reemplazo (), el string
    // original probablemente ya estaba bien: devolvemos el original.
    return repaired.includes('�') ? s : repaired;
  } catch {
    return s;
  }
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Clave de match de país: sin acentos, sin conectores ("y", "del", "de"),
 * lowercase, sin espacios. "Bosnia y Herzegovina" -> "bosniaherzegovina".
 */
function countryKey(name: string): string {
  return stripAccents(name.toLowerCase())
    .replace(/\b(y|del|de|la|las|los|el)\b/g, ' ')
    .replace(/[^a-z]/g, '');
}

/**
 * Clave de match de nombre de persona (jugador o archivo): solo letras+dígitos,
 * sin acentos, lowercase. "Gerónimo Rulli" y "Geronimo_Rulli" -> "geronimorulli".
 * Tolera diferencias de acentos, espacios/guiones bajos y mayúsculas entre el
 * nombre del JSON y el nombre del archivo del ZIP.
 */
function nameKey(s: string): string {
  return stripAccents(s.toLowerCase()).replace(/[^a-z0-9]/g, '');
}

@Injectable()
export class SquadSeederService {
  private readonly logger = new Logger(SquadSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed(options: SquadSeedOptions = {}): Promise<SquadSeedSummary> {
    const path =
      options.dataPath ??
      resolve(process.cwd(), 'prisma', 'data', 'mundial2026_planteles.json');
    const data: RawData = JSON.parse(readFileSync(path, 'utf-8'));
    const warnings: string[] = [];

    // Carpeta de fotos: por defecto apps/web/public/players (relativo a la raíz
    // del monorepo desde apps/api). Si no existe, se omite el seteo de photoUrl.
    const photosDir =
      options.photosDir ??
      resolve(process.cwd(), '..', 'web', 'public', 'players');
    const photosPublicBase = options.photosPublicBase ?? '/players';
    const photosEnabled = existsSync(photosDir);
    if (!photosEnabled) {
      warnings.push(
        `Carpeta de fotos no encontrada (${photosDir}). Se omite photoUrl.`,
      );
    }

    // 1) Torneo activo (el Mundial 2026 sembrado por worldcup-seeder).
    const tournament = await this.prisma.tournament.findFirst({
      where: { isActive: true },
    });
    if (!tournament) {
      throw new Error(
        'No hay torneo activo. Sembrá el Mundial primero (db:seed-worldcup).',
      );
    }

    // 2) Índice de teams por clave de país normalizada.
    const teams = await this.prisma.team.findMany();
    const teamByKey = new Map<string, { id: string; name: string }>();
    for (const t of teams) {
      teamByKey.set(countryKey(t.name), { id: t.id, name: t.name });
    }

    let teamsMatched = 0;
    let playersImported = 0;
    let squadEntries = 0;
    let photosMatched = 0;
    // Ids de Player tocados en esta corrida; lo que quede fuera son huérfanos
    // de corridas previas (p.ej. registros con nombre corrupto cuyo externalId
    // cambió al corregirse el nombre).
    const seenPlayerIds = new Set<string>();
    // externalIds generados en esta corrida, para desambiguar homónimos.
    const usedExternalIds = new Set<string>();

    for (const sel of data.selecciones) {
      const paisLimpio = fixMojibake(sel.pais);
      const team = teamByKey.get(countryKey(paisLimpio));
      if (!team) {
        warnings.push(
          `Sin Team para "${paisLimpio}" (key=${countryKey(paisLimpio)}). Plantel omitido.`,
        );
        continue;
      }
      teamsMatched++;

      // Índice de archivos de foto de esta selección, por nameKey del archivo.
      // Tolera diferencias de acentos/espacios entre nombre del JSON y archivo.
      const photoIndex = photosEnabled
        ? this.indexPhotos(photosDir, paisLimpio)
        : null;

      for (const jp of sel.jugadores) {
        const posicion = fixMojibake(jp.posicion);
        const staff = isStaff(posicion);

        let name = fixMojibake(jp.nombre).trim();
        // Corregir nombres dañados irreversiblemente por mojibake (alias).
        const alias = NAME_ALIASES[nameKey(name)];
        if (alias) name = alias;
        const nationality = paisLimpio;
        // El cuerpo técnico no tiene posición de juego; guardamos su rol aparte.
        const position = staff ? undefined : normalizePosition(posicion);
        const role = staff ? posicion : undefined;

        // Resolver foto contra los archivos reales en disco.
        // 1) Match exacto por nameKey(nombre + país).
        // 2) Fallback: el JSON a veces pierde letras eslavas (š, ć, đ) por
        //    mojibake irreversible, así que buscamos el archivo cuyo nombre
        //    "encaje" con las palabras que sí sobrevivieron. Solo aceptamos el
        //    fallback si es UNÍVOCO, y de paso corregimos el nombre con el del
        //    archivo (que sí conserva los caracteres correctos).
        let photoUrl: string | undefined;
        if (photoIndex) {
          const exact = photoIndex.byName.get(
            nameKey(`${name} ${paisLimpio}`),
          );
          if (exact) {
            photoUrl = `${photosPublicBase}/${photoIndex.folder}/${exact.file}`;
            photosMatched++;
          } else {
            const fb = this.fallbackPhoto(photoIndex, name);
            if (fb) {
              photoUrl = `${photosPublicBase}/${photoIndex.folder}/${fb.file}`;
              photosMatched++;
              // Corregir el nombre corrupto con el del archivo (limpio).
              if (fb.cleanName && fb.cleanName !== name) {
                warnings.push(
                  `Nombre corregido: "${name}" -> "${fb.cleanName}" (${paisLimpio})`,
                );
                name = fb.cleanName;
              }
            } else {
              warnings.push(`Sin foto: ${name} (${paisLimpio})`);
            }
          }
        }

        // externalId estable para idempotencia (no hay id de API):
        // "wc2026:<teamId>:<nombre-normalizado>". Se calcula DESPUÉS de la
        // posible corrección de nombre para que sea estable entre corridas.
        // Si dos jugadores del mismo plantel comparten nombre (los dos "Danilo"
        // de Brasil), el segundo lleva sufijo -2 (el orden del JSON es estable,
        // así que el sufijo también lo es entre corridas).
        let externalId = `wc2026:${team.id}:${nameKey(name)}`;
        let dupSuffix = 2;
        while (usedExternalIds.has(externalId)) {
          externalId = `wc2026:${team.id}:${nameKey(name)}-${dupSuffix++}`;
        }
        usedExternalIds.add(externalId);

        const playerData: Prisma.PlayerUncheckedUpdateInput = {
          name,
          position: position ?? undefined,
          nationality,
          photoUrl: photoUrl ?? undefined,
          isStaff: staff,
          role: role ?? undefined,
        };
        const player = await this.prisma.player.upsert({
          where: { externalId },
          update: playerData,
          create: {
            externalId,
            ...(playerData as Prisma.PlayerUncheckedCreateInput),
          },
        });
        playersImported++;

        await this.prisma.squadEntry.upsert({
          where: {
            tournamentId_teamId_playerId: {
              tournamentId: tournament.id,
              teamId: team.id,
              playerId: player.id,
            },
          },
          update: {},
          create: {
            tournamentId: tournament.id,
            teamId: team.id,
            playerId: player.id,
          },
        });
        squadEntries++;
        seenPlayerIds.add(player.id);
      }
    }

    await this.cleanupOrphans(seenPlayerIds, warnings);

    this.logger.log(
      `Planteles sembrados: ${teamsMatched} selecciones, ${playersImported} jugadores, ${photosMatched} fotos vinculadas.`,
    );

    return {
      tournamentId: tournament.id,
      teamsMatched,
      playersImported,
      squadEntries,
      photosMatched,
      warnings,
    };
  }

  /**
   * Elimina registros huérfanos de corridas previas: Players sembrados por
   * este seeder (externalId "wc2026:*") que no fueron tocados en la corrida
   * actual — típicamente duplicados con nombre corrupto cuyo externalId cambió
   * al corregirse el nombre. Protege a los que tengan picks de usuarios o
   * figuren como goleador del torneo: esos solo se reportan como warning.
   */
  private async cleanupOrphans(
    seenPlayerIds: Set<string>,
    warnings: string[],
  ): Promise<void> {
    const seen = [...seenPlayerIds];

    const orphans = await this.prisma.player.findMany({
      where: {
        externalId: { startsWith: 'wc2026:' },
        id: { notIn: seen },
      },
      select: {
        id: true,
        name: true,
        _count: { select: { topScorerPicks: true, topScorerOf: true } },
      },
    });
    if (!orphans.length) return;

    const deletable = orphans.filter(
      (o) => o._count.topScorerPicks === 0 && o._count.topScorerOf === 0,
    );
    const protectedOnes = orphans.filter(
      (o) => o._count.topScorerPicks > 0 || o._count.topScorerOf > 0,
    );

    for (const o of protectedOnes) {
      warnings.push(
        `Huérfano con picks de usuarios, no se borra: "${o.name}" (${o.id}). Revisar/migrar a mano.`,
      );
    }

    if (deletable.length) {
      const ids = deletable.map((o) => o.id);
      await this.prisma.squadEntry.deleteMany({
        where: { playerId: { in: ids } },
      });
      await this.prisma.player.deleteMany({ where: { id: { in: ids } } });
      this.logger.log(
        `Limpieza: ${deletable.length} jugadores huérfanos eliminados (duplicados de corridas previas).`,
      );
    }
  }

  /**
   * Indexa los archivos de foto de una selección. Busca la subcarpeta del país
   * por clave normalizada (tolerante a acentos), y mapea cada archivo por la
   * nameKey de su nombre (sin extensión). El nombre de archivo del ZIP incluye
   * el país ("Lionel_Messi_Argentina.png"), así que la clave queda
   * "lionelmessiargentina" — la misma que generamos con `${name} ${pais}`.
   *
   * `entries` guarda además el nombre limpio (sin país ni extensión) para el
   * fallback por apellido y la corrección de nombres corruptos.
   */
  private indexPhotos(photosDir: string, pais: string): PhotoIndex | null {
    // Encontrar la subcarpeta del país (match tolerante a acentos).
    let folder: string | undefined;
    try {
      folder = readdirSync(photosDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .find((dir) => countryKey(dir) === countryKey(pais));
    } catch {
      return null;
    }
    if (!folder) return null;

    const paisKey = countryKey(pais);
    const byName = new Map<string, { file: string; cleanName: string }>();
    const entries: PhotoEntry[] = [];
    try {
      for (const file of readdirSync(resolve(photosDir, folder))) {
        if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
        const base = file.replace(/\.[^.]+$/, ''); // sin extensión
        // Nombre limpio = base sin el sufijo "_Pais" y con _ -> espacios.
        // El país puede ser de varias palabras ("Bosnia_Herzegovina"), así que
        // acumulamos sufijos desde el final hasta cubrir el país completo.
        // "Edin_Džeko_Bosnia_Herzegovina" -> "Edin Džeko".
        const words = base.split('_').filter(Boolean);
        let cut = words.length;
        let suffixKey = '';
        for (let i = words.length - 1; i > 0; i--) {
          suffixKey = countryKey(words[i]) + suffixKey;
          if (suffixKey === paisKey) {
            cut = i;
            break;
          }
        }
        const cleanName = words.slice(0, cut).join(' ');
        byName.set(nameKey(base), { file, cleanName });
        entries.push({ file, cleanName, key: nameKey(cleanName) });
      }
    } catch {
      return null;
    }
    return { folder, byName, entries };
  }

  /**
   * Fallback de matching cuando el nombre del JSON perdió caracteres por
   * mojibake (p.ej. "Stanišić" llegó como "Staniai"). Considera candidato a un
   * archivo si la clave del nombre del JSON es subsecuencia de la del archivo o
   * viceversa — tolera letras borradas en cualquier posición. Solo devuelve
   * resultado si hay UN único candidato, para no asignar la foto equivocada.
   * Los nombres demasiado dañados (con letras transformadas, no solo borradas)
   * no matchean y caen al fallback visual de iniciales en el front.
   */
  private fallbackPhoto(index: PhotoIndex, name: string): PhotoEntry | null {
    const key = nameKey(name);
    if (key.length < 4) return null; // demasiado corto: riesgo de falso positivo

    const candidates = index.entries.filter(
      (e) => isSubsequence(key, e.key) || isSubsequence(e.key, key),
    );
    return candidates.length === 1 ? candidates[0] : null;
  }
}

/** ¿Es `a` subsecuencia de `b`? (todos los chars de `a`, en orden, dentro de `b`) */
function isSubsequence(a: string, b: string): boolean {
  if (a.length > b.length) return false;
  let i = 0;
  for (let j = 0; j < b.length && i < a.length; j++) {
    if (a[i] === b[j]) i++;
  }
  return i === a.length;
}

interface PhotoEntry {
  file: string;
  cleanName: string;
  key: string;
}

interface PhotoIndex {
  folder: string;
  byName: Map<string, { file: string; cleanName: string }>;
  entries: PhotoEntry[];
}
