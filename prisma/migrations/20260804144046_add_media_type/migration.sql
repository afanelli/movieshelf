-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'TV_SERIES');

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "mediaType" "MediaType" NOT NULL DEFAULT 'MOVIE';
