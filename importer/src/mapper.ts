import { MyMoviesRow } from "./csv-parser";

export function mapFormat(format: string) {
  switch (format.toLowerCase()) {
    case "blu-ray":
      return "BLURAY";

    case "dvd":
      return "DVD";

    default:
      return "OTHER";
  }
}


export function normalizeBarcode(barcode: string) {
  if (!barcode) {
    return null;
  }

  if (barcode === "000000000000") {
    return null;
  }

  return barcode;
}


export function mapMovie(row: MyMoviesRow) {
  return {
    title: row.title,
    year: row.year ? Number(row.year) : null,
    imdbId: row.imdbId || null,
    runtime: row.runtime ? Number(row.runtime) : null,
    director: row.director || null,
    actors: row.actors || null
  };
}


export function mapPhysicalEdition(row: MyMoviesRow) {
  return {
    barcode: normalizeBarcode(row.barcode),
    format: mapFormat(row.format),
    myMoviesId: Number(row.id)
  };
}