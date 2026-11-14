-- CreateTable
CREATE TABLE "_MovieToPhysicalEdition" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MovieToPhysicalEdition_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MovieToPhysicalEdition_B_index" ON "_MovieToPhysicalEdition"("B");

-- Preserve every existing Movie–PhysicalEdition relationship.
INSERT INTO "_MovieToPhysicalEdition" ("A", "B")
SELECT "movieId", "id"
FROM "PhysicalEdition";

-- DropForeignKey
ALTER TABLE "PhysicalEdition" DROP CONSTRAINT "PhysicalEdition_movieId_fkey";

-- AlterTable
ALTER TABLE "PhysicalEdition" DROP COLUMN "movieId";

-- AddForeignKey
ALTER TABLE "_MovieToPhysicalEdition" ADD CONSTRAINT "_MovieToPhysicalEdition_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToPhysicalEdition" ADD CONSTRAINT "_MovieToPhysicalEdition_B_fkey" FOREIGN KEY ("B") REFERENCES "PhysicalEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
