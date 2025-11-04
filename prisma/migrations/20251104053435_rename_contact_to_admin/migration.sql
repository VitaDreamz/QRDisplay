/*
  Migration: Rename contact fields to admin fields (preserving data)
  
  Changes:
  - contactName -> adminName (program administrator)
  - contactEmail -> adminEmail
  - contactPhone -> adminPhone
  
  This preserves all existing contact data as admin data.
*/

-- Rename columns (preserves existing data)
ALTER TABLE "stores" RENAME COLUMN "contactName" TO "adminName";
ALTER TABLE "stores" RENAME COLUMN "contactEmail" TO "adminEmail";
ALTER TABLE "stores" RENAME COLUMN "contactPhone" TO "adminPhone";
