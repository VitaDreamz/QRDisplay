-- AlterTable
ALTER TABLE "displays" ADD COLUMN     "setupPhotoCredit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setupPhotoUploadedAt" TIMESTAMP(3),
ADD COLUMN     "setupPhotoUrl" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "setupPhotoCredit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setupPhotoUploadedAt" TIMESTAMP(3),
ADD COLUMN     "setupPhotoUrl" TEXT;
