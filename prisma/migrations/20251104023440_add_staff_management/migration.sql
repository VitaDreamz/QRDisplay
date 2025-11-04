-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "promoRedeemedByStaffId" TEXT,
ADD COLUMN     "redeemedByStaffId" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "ownerEmail" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "ownerPhone" TEXT,
ADD COLUMN     "purchasingEmail" TEXT,
ADD COLUMN     "purchasingManager" TEXT,
ADD COLUMN     "purchasingPhone" TEXT;

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "type" TEXT NOT NULL,
    "staffPin" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onCallDays" TEXT[],
    "onCallHoursStart" TEXT NOT NULL,
    "onCallHoursStop" TEXT NOT NULL,
    "samplesRedeemed" INTEGER NOT NULL DEFAULT 0,
    "salesGenerated" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_staffId_key" ON "staff"("staffId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_redeemedByStaffId_fkey" FOREIGN KEY ("redeemedByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_promoRedeemedByStaffId_fkey" FOREIGN KEY ("promoRedeemedByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
