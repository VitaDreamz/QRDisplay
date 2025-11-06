/*
  Warnings:

  - You are about to drop the column `fulfilledBy` on the `purchase_intents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "purchase_intents" DROP COLUMN "fulfilledBy",
ADD COLUMN     "fulfilledByStaffId" TEXT,
ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "purchase_intents" ADD CONSTRAINT "purchase_intents_fulfilledByStaffId_fkey" FOREIGN KEY ("fulfilledByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
