-- Recentrage sur l'Espagne : la langue préférée d'un utilisateur (emails,
-- notifications) passe de {FR, ES} à {ES, EN}. Le français est retiré.
--
-- Postgres ne permet pas de retirer une valeur d'un enum directement
-- (ALTER TYPE ... DROP VALUE n'existe pas), et des comptes existants ont
-- déjà locale = 'FR' — on recrée donc le type avec les bonnes valeurs et
-- on migre les données au passage (FR -> ES, puisque le public visé est
-- désormais hispanophone).

ALTER TYPE "Locale" RENAME TO "Locale_old";
CREATE TYPE "Locale" AS ENUM ('ES', 'EN');

ALTER TABLE "users" ALTER COLUMN "locale" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "locale" TYPE "Locale" USING (
  CASE "locale"::text
    WHEN 'FR' THEN 'ES'
    ELSE "locale"::text
  END
)::"Locale";
ALTER TABLE "users" ALTER COLUMN "locale" SET DEFAULT 'ES';

DROP TYPE "Locale_old";
