SELECT
  movie.title AS titolo,
  edition.barcode AS barcode,
  edition.format AS formato
FROM "Movie" AS movie
INNER JOIN "PhysicalEdition" AS edition
  ON edition."movieId" = movie.id
WHERE movie."mediaType" = 'MOVIE'
ORDER BY movie.title, edition.format, edition.barcode;