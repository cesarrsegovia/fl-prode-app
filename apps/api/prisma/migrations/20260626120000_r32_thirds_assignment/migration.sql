-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "r32ThirdsAssignment" JSONB,
ADD COLUMN     "r32ThirdsConfirmed" BOOLEAN NOT NULL DEFAULT false;
