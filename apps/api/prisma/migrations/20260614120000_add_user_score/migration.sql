-- UserScore: puntaje global por usuario+torneo, independiente de grupos.
-- Es la fuente del ranking global, de modo que los jugadores que entran
-- desde el provider (Gamblor) sin unirse a ningún grupo también figuren.

-- CreateTable
CREATE TABLE "UserScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "correctWinners" INTEGER NOT NULL DEFAULT 0,
    "exactScores" INTEGER NOT NULL DEFAULT 0,
    "exactGoalsSum" INTEGER NOT NULL DEFAULT 0,
    "firstPredictionAt" TIMESTAMP(3),

    CONSTRAINT "UserScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserScore_userId_tournamentId_key" ON "UserScore"("userId", "tournamentId");

-- AddForeignKey
ALTER TABLE "UserScore" ADD CONSTRAINT "UserScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserScore" ADD CONSTRAINT "UserScore_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: reconstruimos UserScore a partir de las predicciones ya puntuadas,
-- replicando computePredictionOutcome (apps/api/src/modules/resultados/scoring.ts).
-- total            = suma de pointsEarned (ya incluye multiplicador de capitán)
-- correctWinners   = aciertos de resultado 1X2 (p.result == resultado real)
-- exactScores      = aciertos de marcador exacto (home/away adivinado == real)
-- exactGoalsSum    = suma de (homeScore + awayScore) en los partidos con marcador exacto
-- firstPredictionAt = primera predicción puntuada del usuario en el torneo
INSERT INTO "UserScore" (
    "id", "userId", "tournamentId", "total",
    "correctWinners", "exactScores", "exactGoalsSum", "firstPredictionAt"
)
SELECT
    gen_random_uuid()::text,
    p."userId",
    m."tournamentId",
    COALESCE(SUM(p."pointsEarned"), 0),
    COUNT(*) FILTER (
        WHERE p."result" = (
            CASE
                WHEN m."homeScore" > m."awayScore" THEN 'HOME'
                WHEN m."homeScore" < m."awayScore" THEN 'AWAY'
                ELSE 'DRAW'
            END
          )::"Result"
    ),
    COUNT(*) FILTER (
        WHERE p."homeScoreGuess" = m."homeScore"
          AND p."awayScoreGuess" = m."awayScore"
    ),
    COALESCE(SUM(m."homeScore" + m."awayScore") FILTER (
        WHERE p."homeScoreGuess" = m."homeScore"
          AND p."awayScoreGuess" = m."awayScore"
    ), 0),
    MIN(p."createdAt")
FROM "Prediction" p
JOIN "Match" m ON m."id" = p."matchId"
WHERE p."pointsEarned" IS NOT NULL
  AND m."homeScore" IS NOT NULL
  AND m."awayScore" IS NOT NULL
GROUP BY p."userId", m."tournamentId";
