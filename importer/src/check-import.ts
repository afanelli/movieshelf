import fs from "fs";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  const csv = fs.readFileSync(
    "importer/input/mymovies.csv",
    "utf8"
  );

  const rows = parse(csv);

  const csvIds = new Set(
  rows.map((row: string[]) => Number(row[0]))
);

console.log(`Righe CSV: ${rows.length}`);
console.log(`myMoviesId unici CSV: ${csvIds.size}`);

  const imported = await prisma.physicalEdition.findMany({
    where: {
      myMoviesId: {
        not: null,
      },
    },
    select: {
      myMoviesId: true,
    },
  });

  const importedIds = new Set(
    imported.map((r) => r.myMoviesId!)
  );

  const missing = rows.filter(
    (row: string[]) => !importedIds.has(Number(row[0]))
  );

  console.log(`CSV: ${rows.length}`);
  console.log(`Importati: ${importedIds.size}`);
  console.log(`Mancanti: ${missing.length}`);
  console.log();

  for (const row of missing) {
    console.log(`${row[0]} - ${row[2]}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);