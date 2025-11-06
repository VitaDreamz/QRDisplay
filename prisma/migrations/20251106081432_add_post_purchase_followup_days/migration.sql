-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "postPurchaseFollowupDays" INTEGER[] DEFAULT ARRAY[45, 90]::INTEGER[];
