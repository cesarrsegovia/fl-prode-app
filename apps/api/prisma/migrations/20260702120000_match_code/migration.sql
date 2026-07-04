-- Match.code: id estable de siembra (wc-r32-03). Separa el rol estructural del
-- bracket del externalId (que db:map-espn-ids pisa con el event id de ESPN).
ALTER TABLE "Match" ADD COLUMN "code" TEXT;

-- Backfill para BDs donde externalId todavía es el de siembra (dev).
-- En prod (externalId ya remapeado a ESPN) esto no matchea nada; ahí se usa
-- el endpoint admin de relink.
UPDATE "Match" SET "code" = "externalId" WHERE "externalId" LIKE 'wc-%';

CREATE UNIQUE INDEX "Match_tournamentId_code_key" ON "Match"("tournamentId", "code");
