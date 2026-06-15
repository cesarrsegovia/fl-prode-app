-- Notification.payload: { key, params } para traducir el mensaje en el front
-- (i18n por clave en los 4 idiomas). `message` queda como fallback en español.

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "payload" JSONB;
