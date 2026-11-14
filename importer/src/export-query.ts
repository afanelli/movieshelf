import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import "dotenv/config";

function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function csvCell(value: unknown) {
  const text = csvValue(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function exportQueryToCsv(queryFile: string, outputFile: string) {
  const query = (await readFile(queryFile, "utf8")).trim();
  if (!query) throw new Error(`Il file SQL è vuoto: ${queryFile}`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL non è configurata.");

  const client = new Client({ connectionString });
  await client.connect();

  let result;
  try {
    await client.query("BEGIN READ ONLY");
    result = await client.query({ text: query, rowMode: "array" });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  const headers = result.fields.map((field) => field.name);
  if (headers.length === 0) {
    throw new Error("La query non ha restituito colonne. Usa una query SELECT.");
  }

  const lines = [
    headers.map(csvCell).join(","),
    ...result.rows.map((row) => row.map(csvCell).join(",")),
  ];
  const resolvedOutput = path.resolve(outputFile);

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, `\uFEFF${lines.join("\n")}\n`, "utf8");

  return { rowCount: result.rowCount ?? result.rows.length, outputFile: resolvedOutput };
}

async function main() {
  const [queryFile, outputFile, ...extraArgs] = process.argv.slice(2);
  if (!queryFile || !outputFile || extraArgs.length > 0) {
    throw new Error(
      "Uso: npx tsx importer/src/export-query.ts <query.sql> <output.csv>"
    );
  }

  const result = await exportQueryToCsv(path.resolve(queryFile), outputFile);
  console.log(`Righe esportate: ${result.rowCount}`);
  console.log(`File creato: ${result.outputFile}`);
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}