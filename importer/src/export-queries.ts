import path from "node:path";
import { exportQueryToCsv } from "./export-query";

const root = process.cwd();

void exportQueryToCsv(
  path.join(root, "importer/queries/barcodes.sql"),
  path.join(root, "importer/output/barcodes.csv")
)
  .then(({ rowCount, outputFile }) => {
    console.log(`Barcode esportati: ${rowCount}`);
    console.log(`File creato: ${outputFile}`);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });