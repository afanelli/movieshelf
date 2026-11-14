SELECT barcode
FROM "PhysicalEdition"
WHERE barcode IS NOT NULL
ORDER BY barcode;