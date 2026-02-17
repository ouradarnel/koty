-- Add new contribution frequency modes
ALTER TYPE "Frequency" ADD VALUE IF NOT EXISTS 'QUARTERLY';
ALTER TYPE "Frequency" ADD VALUE IF NOT EXISTS 'DELAY';

-- Add optional duration and deadline metadata
ALTER TABLE "contributions"
  ADD COLUMN IF NOT EXISTS "durationPeriods" INTEGER,
  ADD COLUMN IF NOT EXISTS "deadlineDate" TIMESTAMP(3);
