export const POINTS_CORRECT_RESULT = 3;
export const POINTS_EXACT_SCORE = 2; // antes 3 — alineado a Prode Lemon (3+2=5)
export const CAPTAIN_MULTIPLIER = 2;
export const POINTS_CHAMPION = 15;
export const POINTS_TOP_SCORER = 15;

// Mundial 2026: 12 grupos × 4 equipos. Top-2 de cada grupo + 8 mejores terceros.
export const R32_GROUPS_COUNT = 12;
export const R32_TOP2_PER_GROUP = 2;
export const R32_TOP2_TOTAL = R32_GROUPS_COUNT * R32_TOP2_PER_GROUP; // 24
export const R32_BEST_THIRDS_TOTAL = 8;
export const R32_TOTAL_QUALIFIERS = R32_TOP2_TOTAL + R32_BEST_THIRDS_TOTAL; // 32
export const POINTS_R32_QUALIFIER = 1; // 1 por acierto → máximo 32 pts
