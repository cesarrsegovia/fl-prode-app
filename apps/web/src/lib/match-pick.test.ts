import { describe, expect, it } from 'vitest';
import { Result } from '@prode/shared';
import {
  normalizeSavedScore,
  normalizeScoreInput,
  resultFromScore,
  scoreForResult,
} from './match-pick';

describe('normalizeSavedScore', () => {
  // Picks guardados antes del fix podían quedar con un solo lado (el otro null).
  // Al cargarlos, un lado cargado implica que se apostó marcador, así que el
  // null pasa a 0 (coherente con normalizeScoreInput). Ambos null = sin marcador.
  it('completa el lado faltante en 0 cuando solo el local está cargado', () => {
    expect(normalizeSavedScore(2, null)).toEqual({ home: 2, away: 0 });
  });

  it('completa el lado faltante en 0 cuando solo el visitante está cargado', () => {
    expect(normalizeSavedScore(null, 1)).toEqual({ home: 0, away: 1 });
  });

  it('deja ambos vacíos si ninguno estaba cargado', () => {
    expect(normalizeSavedScore(null, null)).toEqual({
      home: undefined,
      away: undefined,
    });
  });

  it('no toca un marcador completo', () => {
    expect(normalizeSavedScore(2, 1)).toEqual({ home: 2, away: 1 });
  });

  it('trata el 0 como valor cargado (no como vacío)', () => {
    expect(normalizeSavedScore(0, null)).toEqual({ home: 0, away: 0 });
  });
});

describe('normalizeScoreInput', () => {
  // El marcador es todo-o-nada: tocar un lado expresa intención de apostar, así
  // que el lado vacío pasa a 0 (el usuario percibe "2 – " como "2-0"). Si no se
  // tocó ningún lado, el marcador queda sin cargar (no suma bonus).
  it('editar el local con el visitante vacío completa el visitante en 0', () => {
    expect(normalizeScoreInput('home', 2, undefined)).toEqual({
      home: 2,
      away: 0,
    });
  });

  it('editar el visitante con el local vacío completa el local en 0', () => {
    expect(normalizeScoreInput('away', 3, undefined)).toEqual({
      home: 0,
      away: 3,
    });
  });

  it('no toca el otro lado si ya tiene valor', () => {
    expect(normalizeScoreInput('home', 2, 1)).toEqual({ home: 2, away: 1 });
  });

  it('borrar un lado con el otro vacío deja ambos vacíos', () => {
    expect(normalizeScoreInput('home', undefined, undefined)).toEqual({
      home: undefined,
      away: undefined,
    });
  });

  it('borrar un lado con el otro cargado conserva el cargado', () => {
    expect(normalizeScoreInput('home', undefined, 1)).toEqual({
      home: undefined,
      away: 1,
    });
  });
});

describe('resultFromScore', () => {
  it('devuelve HOME cuando el local hace más goles', () => {
    expect(resultFromScore(2, 1)).toBe(Result.HOME);
  });

  it('devuelve AWAY cuando el visitante hace más goles', () => {
    expect(resultFromScore(0, 1)).toBe(Result.AWAY);
  });

  it('devuelve DRAW cuando hay empate', () => {
    expect(resultFromScore(1, 1)).toBe(Result.DRAW);
  });

  it('devuelve undefined si falta el marcador local', () => {
    expect(resultFromScore(undefined, 1)).toBeUndefined();
  });

  it('devuelve undefined si falta el marcador visitante', () => {
    expect(resultFromScore(1, undefined)).toBeUndefined();
  });

  it('trata el 0-0 como empate', () => {
    expect(resultFromScore(0, 0)).toBe(Result.DRAW);
  });
});

describe('scoreForResult', () => {
  describe('cuando el marcador está incompleto', () => {
    // El marcador (bonus exacto) es una apuesta OPCIONAL e independiente del
    // ganador. Elegir L/E/V NO debe inventar un marcador: si el usuario no lo
    // jugó, no puede sumar el bonus por acertar el resultado exacto. Por eso un
    // marcador incompleto se deja intacto.
    it('no inventa goles si ambos están vacíos', () => {
      expect(scoreForResult(Result.HOME, undefined, undefined)).toEqual({
        home: undefined,
        away: undefined,
      });
    });

    it('no inventa goles si solo hay un valor', () => {
      expect(scoreForResult(Result.AWAY, 1, undefined)).toEqual({
        home: 1,
        away: undefined,
      });
    });
  });

  describe('HOME (Local) — ajuste mínimo', () => {
    it('no toca un marcador ya coherente', () => {
      expect(scoreForResult(Result.HOME, 2, 1)).toEqual({ home: 2, away: 1 });
    });

    it('sube el local a away+1 desde 0-1', () => {
      expect(scoreForResult(Result.HOME, 0, 1)).toEqual({ home: 2, away: 1 });
    });

    it('rompe el empate subiendo el local desde 1-1', () => {
      expect(scoreForResult(Result.HOME, 1, 1)).toEqual({ home: 2, away: 1 });
    });
  });

  describe('AWAY (Visitante) — ajuste mínimo', () => {
    it('no toca un marcador ya coherente', () => {
      expect(scoreForResult(Result.AWAY, 1, 2)).toEqual({ home: 1, away: 2 });
    });

    it('sube el visitante a home+1 desde 1-0', () => {
      expect(scoreForResult(Result.AWAY, 1, 0)).toEqual({ home: 1, away: 2 });
    });

    it('rompe el empate subiendo el visitante desde 1-1', () => {
      expect(scoreForResult(Result.AWAY, 1, 1)).toEqual({ home: 1, away: 2 });
    });
  });

  describe('DRAW (Empate) — igualar al mayor', () => {
    it('no toca un empate ya existente', () => {
      expect(scoreForResult(Result.DRAW, 1, 1)).toEqual({ home: 1, away: 1 });
    });

    it('iguala al mayor desde 0-1', () => {
      expect(scoreForResult(Result.DRAW, 0, 1)).toEqual({ home: 1, away: 1 });
    });

    it('iguala al mayor desde 2-0', () => {
      expect(scoreForResult(Result.DRAW, 2, 0)).toEqual({ home: 2, away: 2 });
    });
  });
});
