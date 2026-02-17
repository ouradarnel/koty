-- Create table for contribution participation invitations
CREATE TABLE IF NOT EXISTS "contribution_invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "startMode" "MemberStartMode" NOT NULL DEFAULT 'NEXT_PERIOD',
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  "contributionId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "inviteeUserId" TEXT,

  CONSTRAINT "contribution_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contribution_invitations_token_key" ON "contribution_invitations"("token");
CREATE INDEX IF NOT EXISTS "contribution_invitations_contributionId_status_idx" ON "contribution_invitations"("contributionId", "status");
CREATE INDEX IF NOT EXISTS "contribution_invitations_email_status_idx" ON "contribution_invitations"("email", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'contribution_invitations_contributionId_fkey'
      AND table_name = 'contribution_invitations'
  ) THEN
    ALTER TABLE "contribution_invitations"
      ADD CONSTRAINT "contribution_invitations_contributionId_fkey"
      FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'contribution_invitations_invitedById_fkey'
      AND table_name = 'contribution_invitations'
  ) THEN
    ALTER TABLE "contribution_invitations"
      ADD CONSTRAINT "contribution_invitations_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'contribution_invitations_inviteeUserId_fkey'
      AND table_name = 'contribution_invitations'
  ) THEN
    ALTER TABLE "contribution_invitations"
      ADD CONSTRAINT "contribution_invitations_inviteeUserId_fkey"
      FOREIGN KEY ("inviteeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
