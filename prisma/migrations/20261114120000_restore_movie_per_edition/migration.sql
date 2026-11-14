BEGIN;

ALTER TABLE "PhysicalEdition" ADD COLUMN "movieId" TEXT;

WITH ranked_movies AS (
  SELECT
    link."B" AS edition_id,
    link."A" AS movie_id,
    ROW_NUMBER() OVER (
      PARTITION BY link."B"
      ORDER BY movie.title, movie.id
    ) AS movie_rank
  FROM "_MovieToPhysicalEdition" AS link
  JOIN "Movie" AS movie ON movie.id = link."A"
)
UPDATE "PhysicalEdition" AS edition
SET "movieId" = ranked_movies.movie_id
FROM ranked_movies
WHERE ranked_movies.movie_rank = 1
  AND ranked_movies.edition_id = edition.id;

WITH ranked_movies AS (
  SELECT
    link."B" AS edition_id,
    link."A" AS movie_id,
    ROW_NUMBER() OVER (
      PARTITION BY link."B"
      ORDER BY movie.title, movie.id
    ) AS movie_rank
  FROM "_MovieToPhysicalEdition" AS link
  JOIN "Movie" AS movie ON movie.id = link."A"
)
INSERT INTO "PhysicalEdition" (
  id,
  "movieId",
  barcode,
  asin,
  "collectionId",
  format,
  "seasonNumber",
  "editionType",
  "editionTitle",
  "isBoxSet",
  "collectionName",
  country,
  "releaseDate",
  quantity,
  "myMoviesId",
  "coverUrl",
  "coverLocal",
  "purchaseDate",
  "purchasePrice",
  location,
  condition,
  notes,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  ranked_movies.movie_id,
  NULL,
  edition.asin,
  edition."collectionId",
  edition.format,
  edition."seasonNumber",
  edition."editionType",
  edition."editionTitle",
  edition."isBoxSet",
  edition."collectionName",
  edition.country,
  edition."releaseDate",
  edition.quantity,
  NULL,
  edition."coverUrl",
  edition."coverLocal",
  edition."purchaseDate",
  edition."purchasePrice",
  edition.location,
  edition.condition,
  edition.notes,
  edition."createdAt",
  edition."updatedAt"
FROM ranked_movies
JOIN "PhysicalEdition" AS edition ON edition.id = ranked_movies.edition_id
WHERE ranked_movies.movie_rank > 1;

ALTER TABLE "PhysicalEdition" ALTER COLUMN "movieId" SET NOT NULL;
ALTER TABLE "PhysicalEdition"
  ADD CONSTRAINT "PhysicalEdition_movieId_fkey"
  FOREIGN KEY ("movieId") REFERENCES "Movie"(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "_MovieToPhysicalEdition";

COMMIT;