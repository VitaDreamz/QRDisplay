-- AlterTable
ALTER TABLE "products" ADD COLUMN     "productType" TEXT NOT NULL DEFAULT 'retail',
ADD COLUMN     "retailPrice" DECIMAL(10,2),
ADD COLUMN     "unitsPerBox" INTEGER,
ADD COLUMN     "wholesalePrice" DECIMAL(10,2);
