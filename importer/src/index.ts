import { readMyMoviesCsv } from "./csv-parser";
import { importMovies } from "./importer";


async function main() {

  const rows = await readMyMoviesCsv(
    "./importer/input/mymovies.csv"
  );


  console.log(
    `CSV letto: ${rows.length} righe`
  );


  await importMovies(rows);

}


main()
  .catch((error) => {

    console.error(error);
    process.exit(1);

  });