-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "purchasedStars" INTEGER NOT NULL DEFAULT 0;

-- Update default credits to 3
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 3;

