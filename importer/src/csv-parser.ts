import fs from "fs";
import path from "path";
import csv from "csv-parser";

export interface MyMoviesRow {
  id: string;
  type: string;
  title: string;
  barcode: string;
  format: string;
  year: string;
  imdbId: string;
  runtime: string;
  director: string;
  actors: string;
}

export function readMyMoviesCsv(filePath: string): Promise<MyMoviesRow[]> {
  return new Promise((resolve, reject) => {
    const rows: MyMoviesRow[] = [];

    fs.createReadStream(path.resolve(filePath))
      .pipe(
        csv({
          headers: [
            "id",
            "type",
            "title",
            "barcode",
            "format",
            "year",
            "imdbId",
            "runtime",
            "director",
            "actors"
          ]
        })
      )
      .on("data", (row) => {
        rows.push(row as MyMoviesRow);
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}