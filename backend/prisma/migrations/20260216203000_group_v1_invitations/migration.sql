-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MemberStartMode" AS ENUM ('CURRENT_PERIOD', 'NEXT_PERIOD');

-- AlterTable
ALTER TABLE "groups" ADD COLUMN "createdById" TEXT;

-- AlterTable
ALTER TABLE "group_members" ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "endDate" TIMESTAMP(3);

-- Backfill group creator from earliest manager (fallback: earliest member)
UPDATE "groups" g
SET "createdById" = COALESCE(
  (
    SELECT gm."userId"
    FROM "group_members" gm
    WHERE gm."groupId" = g."id" AND gm."role" = 'MANAGER'
    ORDER BY gm."joinedAt" ASC
    LIMIT 1
  ),
  (
    SELECT gm2."userId"
    FROM "group_members" gm2
    WHERE gm2."groupId" = g."id"
    ORDER BY gm2."joinedAt" ASC
    LIMIT 1
  )
);

-- Enforce creator required
ALTER TABLE "groups" ALTER COLUMN "createdById" SET NOT NULL;

-- CreateTable
CREATE TABLE "group_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "startMode" "MemberStartMode" NOT NULL DEFAULT 'NEXT_PERIOD',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "inviteeUserId" TEXT,

    CONSTRAINT "group_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_invitations_token_key" ON "group_invitations"("token");

-- CreateIndex
CREATE INDEX "group_invitations_groupId_status_idx" ON "group_invitations"("groupId", "status");

-- CreateIndex
CREATE INDEX "group_invitations_email_status_idx" ON "group_invitations"("email", "status");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
