import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});
import fs from "fs/promises";
import path from "path";

const COVER_DIR = path.join(
  process.cwd(),
  "public/covers"
);


async function main() {

  await fs.mkdir(COVER_DIR, {
    recursive: true,
  });


  const editions =
    await prisma.physicalEdition.findMany({
      where: {
        coverUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        coverUrl: true,
      },
    });


  console.log(
    `Cover da scaricare: ${editions.length}`
  );


  let downloaded = 0;


  for (const edition of editions) {

    if (!edition.coverUrl) {
      continue;
    }


    const filename =
      `${edition.id}.jpg`;


    const filepath =
      path.join(
        COVER_DIR,
        filename
      );


    try {

      const response =
        await fetch(
          edition.coverUrl
        );


      if (!response.ok) {
        console.log(
          "ERRORE:",
          edition.coverUrl
        );
        continue;
      }


      const buffer =
        Buffer.from(
          await response.arrayBuffer()
        );


      await fs.writeFile(
        filepath,
        buffer
      );


      await prisma.physicalEdition.update({
        where: {
          id: edition.id,
        },
        data: {
          coverUrl:
            `/covers/${filename}`,
        },
      });


      downloaded++;

      console.log(
        `✅ ${downloaded}/${editions.length}`
      );


    } catch(e) {

      console.log(
        "Errore:",
        edition.coverUrl
      );

    }

  }


  console.log(
    "Completato:",
    downloaded
  );

}


main()
  .catch(console.error)
  .finally(() =>
    prisma.$disconnect()
  );