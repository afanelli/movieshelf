import { PrismaClient } from "@prisma/client";
import {
  mapMovie,
  mapPhysicalEdition
} from "./mapper";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});


export async function importMovies(rows: MyMoviesRow[]) {

  let createdMovies = 0;
  let createdEditions = 0;
  let skippedEditions = 0;


  for (const row of rows) {

    const movieData = mapMovie(row);
    const editionData = mapPhysicalEdition(row);


    // 1. Cerca o crea il film
    let movie = null;
    
    // Cerca per IMDb solo se è un valore valido
    if (
      movieData.imdbId &&
      /^tt\d{7,}$/.test(movieData.imdbId) &&
      movieData.imdbId !== "tt0000000"
    ) {
      movie = await prisma.movie.findUnique({
        where: {
          imdbId: movieData.imdbId,
        },
      });
    }
    
    // Fallback: cerca per titolo + anno
    if (!movie) {
      movie = await prisma.movie.findFirst({
        where: {
          title: movieData.title,
          year: movieData.year,
        },
      });
    }


    if (!movie) {

      movie = await prisma.movie.create({
        data: movieData
      });

      createdMovies++;

      console.log(
        `🎬 Movie creato: ${movie.title}`
      );
    }


    // 2. Cerca se esiste già questa edizione

    let existingEdition = null;


    if (editionData.barcode) {

      existingEdition = await prisma.physicalEdition.findFirst({
        where: {
          barcode: editionData.barcode
        }
      });

    }


    if (existingEdition) {

      skippedEditions++;

      console.log(
        `⏭️  Edizione già presente: ${movie.title}`
      );

      continue;
    }


    // 3. Crea edizione fisica

    await prisma.physicalEdition.create({
      data: {
        movieId: movie.id,
        ...editionData
      }
    });


    createdEditions++;

    console.log(
      `💿 Edizione creata: ${movie.title}`
    );
  }


  console.log("\n======================");
  console.log(`Film creati: ${createdMovies}`);
  console.log(`Edizioni create: ${createdEditions}`);
  console.log(`Edizioni saltate: ${skippedEditions}`);
  console.log("======================");


  await prisma.$disconnect();
}