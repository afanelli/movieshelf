-- AlterTable
ALTER TABLE "PhysicalEdition" ADD COLUMN     "collectionName" TEXT,
ADD COLUMN     "isBoxSet" BOOLEAN NOT NULL DEFAULT false;
