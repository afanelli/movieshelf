import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

type CoverEntry = {
  title: string;
  cover: string;
};

const INPUT_FILE = path.join(
  process.cwd(),
  "importer/input/covers.json"
);

const OUTPUT_FILE = path.join(
  process.cwd(),
  "importer/input/covers-not-imported.json"
);


function normalize(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}


async function main() {

  const covers: CoverEntry[] = JSON.parse(
    fs.readFileSync(INPUT_FILE, "utf8")
  );

  console.log(`Cover lette: ${covers.length}`);
  console.log("==============================");

  const notImported: any[] = [];

  let imported = 0;


  for (const cover of covers) {

    const normalizedTitle = normalize(cover.title);


    const movies = await prisma.movie.findMany({
      where: {
        title: {
          equals: cover.title,
          mode: "insensitive",
        },
      },
      include: {
        editions: true,
      },
    });


    /*
      Match sicuro:
      - esiste un solo Movie
      - ha almeno una PhysicalEdition senza cover
    */
    if (
      movies.length === 1 &&
      movies[0].editions.some(e => !e.coverUrl)
    ) {

      const movie = movies[0];

      const edition = movie.editions.find(
        e => !e.coverUrl
      );


      console.log(
        `✅ MATCH SICURO`
      );
      console.log(
        `   ${movie.title}`
      );
      console.log(
        `   ${cover.cover}`
      );


      await prisma.physicalEdition.update({
        where: {
          id: edition!.id,
        },
        data: {
          coverUrl: cover.cover,
        },
      });
      


      imported++;

    } else {

      console.log(
        `⚠️ NON IMPORTATO`
      );
      console.log(
        `   cover: ${cover.title}`
      );


      notImported.push({
        coverTitle: cover.title,
        coverUrl: cover.cover,
        reason:
          movies.length === 0
            ? "NO_MOVIE_MATCH"
            : movies.length > 1
              ? "MULTIPLE_MOVIES"
              : "NO_EMPTY_EDITION",
        candidates: movies.map(m => ({
          title: m.title,
          editions: m.editions.length,
        })),
      });

    }

  }


  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      notImported,
      null,
      2
    )
  );


  console.log("");
  console.log("==============================");
  console.log(
    `Importabili: ${imported}`
  );
  console.log(
    `Non importati: ${notImported.length}`
  );
  console.log(
    `Creato: ${OUTPUT_FILE}`
  );


}


main()
  .catch(console.error)
  .finally(() =>
    prisma.$disconnect()
  );