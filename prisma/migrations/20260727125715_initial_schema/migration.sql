-- CreateEnum
CREATE TYPE "Format" AS ENUM ('DVD', 'BLURAY', 'UHD4K', 'HDDVD', 'VHS', 'OTHER');

-- CreateEnum
CREATE TYPE "EditionType" AS ENUM ('STANDARD', 'STEELBOOK', 'COLLECTOR', 'DIGIBOOK', 'LIMITED', 'OTHER');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR');

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "year" INTEGER,
    "imdbId" TEXT,
    "runtime" INTEGER,
    "director" TEXT,
    "actors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalEdition" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "barcode" TEXT,
    "format" "Format" NOT NULL,
    "editionType" "EditionType" NOT NULL DEFAULT 'STANDARD',
    "country" TEXT,
    "releaseDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "myMoviesId" INTEGER,
    "coverUrl" TEXT,
    "coverLocal" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(65,30),
    "location" TEXT,
    "condition" "Condition",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalEdition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_imdbId_key" ON "Movie"("imdbId");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalEdition_barcode_key" ON "PhysicalEdition"("barcode");

-- AddForeignKey
ALTER TABLE "PhysicalEdition" ADD CONSTRAINT "PhysicalEdition_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
