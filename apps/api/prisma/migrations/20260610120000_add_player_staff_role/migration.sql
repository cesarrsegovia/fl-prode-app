-- Cuerpo técnico en Player: isStaff marca DT/asistentes (excluidos del
-- selector de goleador); role guarda el rol original ("Entrenador", ...).
ALTER TABLE "Player" ADD COLUMN "isStaff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Player" ADD COLUMN "role" TEXT;
