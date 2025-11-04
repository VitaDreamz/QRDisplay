/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `staff` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "verificationExpiry" TIMESTAMP(3),
ADD COLUMN     "verificationToken" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "staff_verificationToken_key" ON "staff"("verificationToken");
