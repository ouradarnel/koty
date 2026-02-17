-- AlterTable
ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN "lastName" TEXT;

-- Backfill from existing full name.
UPDATE "users"
SET
  "firstName" = COALESCE(NULLIF(split_part(trim("name"), ' ', 1), ''), 'Utilisateur'),
  "lastName" = COALESCE(
    NULLIF(trim(substring(trim("name") FROM position(' ' IN trim("name")) + 1)), ''),
    'Local'
  )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

-- Enforce required columns.
ALTER TABLE "users" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "lastName" SET NOT NULL;
