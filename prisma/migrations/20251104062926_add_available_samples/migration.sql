-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "availableSamples" TEXT[] DEFAULT ARRAY[]::TEXT[];
