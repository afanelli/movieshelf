# MovieShelf – Project Context & Development Handoff

## 1. Project overview

**MovieShelf** is a personal web application for cataloguing a physical movie collection, including DVDs, Blu-rays, 4K UHDs and TV series.

The application is intended to manage:
- Movies and TV series.
- Physical editions and their metadata.
- Barcodes (EAN).
- Movie and edition cover images.
- Box sets and collections containing multiple movies or editions.
- Search, filtering and different catalogue views.
- Import/export of catalogue data through CSV.

The goal is to have a personal, locally hosted catalogue that can be progressively extended without relying on tools such as Prisma Studio for everyday operations.

## 2. Technology stack

The project currently uses:

- **Frontend:** Next.js 16.2.12, React and TypeScript.
- **Backend/data access:** Prisma ORM.
- **Database:** PostgreSQL.
- **Database environment:** Docker Compose.
- **Local development:** Node.js and npm.
- **Images:** locally stored cover files served as static assets by Next.js.
- **Prisma adapter:** `@prisma/adapter-pg`, using `pg` and the `DATABASE_URL` environment variable.
- **Scripts:** TypeScript scripts executed with `tsx`.

The project is developed locally on macOS.

## 3. Project directory structure

Project root:

`/Users/alessiomariofanelli/work/movieshelf`

Main structure:

```text
movieshelf/
│
├── docker-compose.yml
├── package.json
├── .env
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── importer/
│   ├── input/
│   │   ├── covers.json
│   │   └── covers-not-imported.json
│   │
│   ├── output/
│   │
│   └── src/
│       ├── import-covers.ts
│       ├── download-covers.ts
│       └── export-queries.ts
│
└── web/
    ├── package.json
    ├── app/
    │   ├── page.tsx
    │   └── components/
    │       └── MovieCatalog.tsx
    │
    ├── lib/
    │   └── prisma.ts
    │
    └── public/
        └── covers/
```

This is the structure reconstructed from previous development discussions. Always inspect the actual repository before editing: additional files, routes, components or scripts may have been added since this description.

### Main file responsibilities

**Root `docker-compose.yml`**
- Defines the Docker services, including PostgreSQL.
- Used to start the database environment.

**Root `.env`**
- Contains environment variables, including `DATABASE_URL`.
- Must not be committed or exposed.

**`prisma/schema.prisma`**
- Defines the database models, fields, enums and relationships.
- Changes to the data model should start here.
- After schema changes, regenerate the Prisma Client and apply the appropriate migration.

**`prisma/migrations/`**
- Stores the database migration history.

**`web/lib/prisma.ts`**
- Central Prisma Client initialization.
- Application code should reuse this client rather than creating a new Prisma Client instance in every component or request.

**`web/app/page.tsx`**
- Main catalogue page.
- Fetches movies and their physical editions from PostgreSQL through Prisma.
- Selects the fields required by the frontend and passes the data to `MovieCatalog`.

**`web/app/components/MovieCatalog.tsx`**
- Main client-side catalogue component.
- Responsible for rendering the catalogue and managing user interactions.
- Previously implemented functionality includes search, format filters, cover filters, sorting and grid/list display.
- This is the main component to extend for the new collection display modes.

**`importer/src/import-covers.ts`**
- Imports cover URLs from `importer/input/covers.json`.
- Attempts to match cover entries with movies in the database.
- Updates the `coverUrl` field of physical editions.
- Writes unmatched entries to `covers-not-imported.json`.
- This was designed as a one-off import utility, not necessarily as a permanent application feature.

**`importer/src/download-covers.ts`**
- Downloads cover images from their original URLs.
- Used to move cover assets from remote hosting to local storage.

**`web/public/covers/`**
- Contains downloaded cover images.
- Files are served directly by Next.js.
- Database `coverUrl` values should use paths such as `/covers/example.jpg`, not absolute filesystem paths.

**`importer/src/export-queries.ts`**
- Exports barcodes from `PhysicalEdition` into a CSV file.
- The current requirement is to export only the `barcode` column.
- Output location: `importer/output/barcodes.csv`.

## 4. Data model and domain concepts

The central design decision is to distinguish between a logical movie, its physical copies and the collections to which those copies belong.

### Movie

Represents a logical title in the catalogue.

Examples:
- Matrix
- Matrix Reloaded
- Matrix Revolutions
- The Sopranos

It contains information such as:
- `id`
- `title`
- `mediaType`
- `year`
- `director`

`mediaType` distinguishes between films and TV series. The project adopted an enum-based approach rather than using free text.

The intended user-facing categories are:
- Film
- Serie TV

### PhysicalEdition

Represents an actual physical edition/copy of a movie or TV series.

A single Movie can have multiple PhysicalEdition records.

Relevant fields discussed:
- `id`
- `format`
- `barcode`
- `coverUrl`
- `isBoxSet`
- `collectionName`
- `collectionId`
- `seasonNumber`

`seasonNumber` is a **string**, not an integer. This is intentional because season identifiers may contain values such as `6 - Parte 1` and `6 - Parte 2`.

Each PhysicalEdition belongs to one Movie and may optionally belong to a Collection.

### Collection

Represents a physical box set or collection containing multiple physical editions.

Known Prisma model structure:

```prisma
model Collection {
  id        String   @id @default(uuid())
  name      String
  barcode   String?
  coverUrl  String?
  editions  PhysicalEdition[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

The relationship is between Collection and PhysicalEdition, not directly between Collection and Movie. Each collection contains editions, and each edition is linked to one logical movie.

This distinction matters because a collection contains physical editions, and those editions are linked to logical movies.

### Example: Matrix Ultimate Collection

The Matrix Ultimate Collection contains three films:
- Matrix
- Matrix Reloaded
- Matrix Revolutions

The correct conceptual structure is:

```text
Collection
└── Matrix Ultimate Collection
    ├── PhysicalEdition → Movie: Matrix
    ├── PhysicalEdition → Movie: Matrix Reloaded
    └── PhysicalEdition → Movie: Matrix Revolutions
```

Do not create an additional Movie record to represent the box set itself.

The individual films must remain independent Movie records, even when their physical editions belong to a collection.

### Example: The Sopranos

The Sopranos is represented as one logical TV series:
- Movie: I Soprano
- Multiple PhysicalEdition records, one per season/edition.

The season identifier is stored as a string to support special cases and split seasons.

## 5. Features already implemented or discussed

### 5.1 Main catalogue

The application has a main catalogue that retrieves Movie records and their PhysicalEdition records.

Previously implemented frontend capabilities:
- Grid and list display.
- Text search.
- Filtering by physical format.
- Filtering by cover availability.
- Sorting.
- Display of movie cover images.

The exact current implementation should be checked in `MovieCatalog.tsx`.

### 5.2 Film and TV series distinction

The project introduced a `mediaType` enum to distinguish films from TV series.

The intended frontend filter is:

`Tutti | 🎬 Film | 📺 Serie TV`

The intended statistics are:
- Number of films.
- Number of TV series.
- Number of physical editions.

Verify that the current frontend selects and uses `mediaType` correctly. The last known version of `page.tsx` did not yet include `mediaType` in its Prisma select, so this may still need completing.

### 5.3 Cover images

Cover images were initially imported from external URLs and then downloaded locally.

The local covers directory must be:

`web/public/covers/`

Example database value:

`/covers/8cfa90a1-cf7b-409a-9fb9-b73a767f5b93.jpg`

Do not save paths such as `/Users/...` in the database.

A cover fallback was designed:
1. Use the cover of the PhysicalEdition, if available.
2. Otherwise, use the cover of the associated Collection, if available.

The collection relationship is nested under each edition, not directly under Movie.

Conceptually:

```ts
const cover =
  movie.editions.find(e => e.coverUrl)?.coverUrl
  ??
  movie.editions.find(e => e.collection?.coverUrl)
    ?.collection?.coverUrl;
```

The frontend TypeScript type must include the nested `collection` property, and the Prisma query must select it.

A previous implementation issue was caused by the frontend type not including `collection` even though the Prisma query selected it.

If Prisma reports an unknown field after schema changes, verify the schema and regenerate the client:

```bash
npx prisma generate
```

### 5.4 Barcode export

A utility script was created to export barcodes from PhysicalEdition.

The current requirement is a CSV with only one column:

```csv
barcode
7321958836156
7321961178472
...
```

Equivalent SQL:

```sql
SELECT barcode
FROM "PhysicalEdition"
WHERE barcode IS NOT NULL;
```

The script is intended to write:

`importer/output/barcodes.csv`

The CSV should preserve barcode values as text, including possible leading zeros.

### 5.5 CSV import/export – planned functionality

The project has discussed a more complete CSV import/export system.

The intended approach:
- Export one row per PhysicalEdition.
- Import one row per PhysicalEdition.
- Each row contains the movie metadata and the physical edition metadata.
- If the movie already exists, reuse it rather than creating a duplicate.
- If the movie does not exist, create it.
- If a collection is specified, find or create the Collection and link the PhysicalEdition to it.

Proposed CSV structure:

```csv
title,mediaType,year,director,format,barcode,collectionName,isBoxSet,seasonNumber
```

A `coverUrl` column was also discussed as a possible extension, but the core format above is the agreed baseline.

The proposed deduplication key for Movie is:
- title
- mediaType

A dry-run mode was suggested to preview changes before committing them.

This full CSV import/export functionality should be considered **planned, not confirmed as implemented**. The barcode export is a separate, simpler utility.

## 6. New feature: configurable collection display

This is the latest feature discussed and should be treated as a priority.

### Problem

Currently, the catalogue displays:
- Individual films belonging to a collection.
- The collection itself.

This creates duplicate-looking entries and makes the catalogue harder to browse.

Example:
- Matrix
- Matrix Reloaded
- Matrix Revolutions
- Matrix Ultimate Collection

The user wants to choose how collections are represented.

### Required display modes

Add a selector to the catalogue with two modes:

1. **Film singoli**
2. **Collection**

#### Mode A: Film singoli

Display all individual Movie records, as in the current catalogue.

If a movie has a PhysicalEdition linked to a Collection:
- Display the movie normally.
- Show a badge or label indicating the collection name.
- The collection name should be clickable if practical, opening the collection details.

Example:

```text
Matrix
[Matrix Ultimate Collection]

Matrix Reloaded
[Matrix Ultimate Collection]

Matrix Revolutions
[Matrix Ultimate Collection]
```

#### Mode B: Collection

Display a single card for each Collection rather than showing the individual movies represented by that collection.

Example:

```text
Matrix Ultimate Collection
3 film
```

When the user clicks the collection card, open a detail view (modal, drawer or dedicated route) showing:
- Collection cover.
- Collection name.
- List of movies contained in the collection.
- Their individual covers, where available.
- Relevant physical edition details, such as format, barcode and season if applicable.

### Important edge case

A movie may have:
- An edition belonging to a collection.
- Another edition owned individually and not belonging to any collection.

The implementation must not accidentally hide the standalone edition when switching to Collection mode.

A sensible rule is:
- Represent editions belonging to collections through their Collection card.
- Continue to display standalone/unassociated editions as individual movie cards.

Do not simply exclude every Movie that has any collection association. Determine whether it has any physical editions not linked to a collection.

If the same Movie appears in more than one collection, avoid losing either relationship. The UI should make the associations clear.

### Data fetching

The current `page.tsx` already selects collection details nested under PhysicalEdition:

```ts
collection: {
  select: {
    name: true,
    coverUrl: true,
  },
},
```

This may need to be expanded to include:
- Collection ID.
- Collection barcode.
- Collection editions and their related Movie details, depending on how the detail view is implemented.

Prefer fetching the required relationships efficiently rather than introducing N+1 database queries.

### Frontend implementation

The main component to modify is:

`web/app/components/MovieCatalog.tsx`

Add a state variable for the display mode and a selector.

Ensure that:
- Existing search continues to work.
- Existing format and cover filters continue to work.
- Sorting works in both modes.
- Statistics remain meaningful and do not count a collection as an additional movie.
- Collection cards use the collection cover, with an appropriate fallback if missing.
- The collection detail view lists the actual movies represented by the collection.

Do not break the existing grid/list views. Collection mode should work coherently with the catalogue's existing presentation.

## 7. New feature: add a movie through the graphical interface

This is another feature explicitly requested and should be implemented after understanding the current code.

The user wants to add a new movie without using Prisma Studio.

Create an interface accessible from the main catalogue, for example with an **Aggiungi film** button.

The form should contain three sections.

### Section 1: Movie information

Fields:
- Title (required).
- Media type: Film / Serie TV.
- Year.
- Director.

### Section 2: Physical edition

Fields:
- Format (DVD / Blu-ray / 4K UHD / other values supported by the existing schema).
- Barcode / EAN.
- `isBoxSet`.
- `seasonNumber` for TV series, if applicable.
- Cover image / cover URL, depending on the existing image-management approach.

### Section 3: Optional Collection

Fields:
- Collection name.
- Collection barcode.
- Collection cover.

The collection section must be optional.

### Save behavior

The intended behavior:
1. Validate the form.
2. Check whether a Movie already exists.
3. If it exists, allow the user to select/reuse it and add a new PhysicalEdition instead of creating a duplicate Movie.
4. If it does not exist, create the Movie.
5. If collection information is supplied, find or create the Collection and associate the PhysicalEdition with it.
6. Create the PhysicalEdition.
7. Perform the related database writes in a single Prisma transaction.

The initial implementation should create **one PhysicalEdition per form submission**. Multiple editions can be added through subsequent submissions without duplicating the Movie.

Do not create a separate Movie record for a collection.

### Suggested implementation

Potential files:
- `web/app/components/AddMovieForm.tsx`
- A server action or API route for saving the data.
- Optional validation schema, depending on existing project conventions.

Before choosing Server Actions or API routes, inspect the existing application architecture and follow its conventions.

The form should provide:
- Required field validation.
- Clear error messages.
- Success confirmation.
- A way to return to the catalogue after saving.
- A refresh/revalidation of the catalogue so the new record appears immediately.

Avoid adding unnecessary dependencies if the current stack already supports the required validation and UI.

## 8. Other pending development tasks

Suggested priority order:

1. Implement the two collection display modes and collection detail view.
2. Implement the graphical form to add a Movie, PhysicalEdition and optional Collection.
3. Verify and complete the Film / Serie TV filter and related statistics.
4. Complete the full CSV export/import functionality.
5. Improve duplicate detection and validation during import.
6. Consider adding editing/deletion functionality for existing movies, editions and collections.

The first two are the most recently discussed requirements.

## 9. Development environment and commands

### Start PostgreSQL

From the project root:

```bash
cd /Users/alessiomariofanelli/work/movieshelf
docker compose up -d
```

### Start the frontend

```bash
cd /Users/alessiomariofanelli/work/movieshelf/web
npm run dev
```

Open:

`http://localhost:3000`

### Prisma Studio

From the project root:

```bash
npx prisma studio
```

Usually available at:

`http://localhost:5555`

### Regenerate Prisma Client

From the project root:

```bash
npx prisma generate
```

### Check migration status

```bash
npx prisma migrate status
```

### Run barcode export

From the project root:

```bash
npx tsx importer/src/export-queries.ts
```

### Useful database checks

Count physical editions with a cover:

```sql
SELECT COUNT(*)
FROM "PhysicalEdition"
WHERE "coverUrl" IS NOT NULL;
```

Find movies with editions but no individual edition covers:

```sql
SELECT
    m.id,
    m.title,
    m.year,
    COUNT(pe.id) AS editions
FROM "Movie" m
LEFT JOIN "PhysicalEdition" pe
  ON pe."movieId" = m.id
GROUP BY m.id, m.title, m.year
HAVING COUNT(pe.id) > 0
   AND COUNT(pe."coverUrl") = 0
ORDER BY m.title;
```

## 10. Development guidelines for the AI coding assistant

When working on MovieShelf, follow these rules:

1. **Inspect before modifying.** Read the current source files and Prisma schema before proposing or applying changes. This handoff may not reflect the latest repository state.
2. **Preserve the existing architecture.** Extend the current Next.js and Prisma implementation rather than rewriting working parts.
3. **Respect the data model.** Movie, PhysicalEdition and Collection are distinct entities with different responsibilities.
4. **Do not model a box set as a Movie.** Collections are separate entities linked to PhysicalEdition.
5. **Avoid duplicate Movie records.** Reuse an existing Movie when adding another physical edition of the same title and media type.
6. **Use database transactions** for operations that create or associate multiple related records.
7. **Preserve existing catalogue features.** Search, filters, sorting, grid/list views and cover fallbacks must continue to work after changes.
8. **Keep cover paths compatible with Next.js static serving.** Use `/covers/...` paths for locally stored images.
9. **Avoid unnecessary complexity.** This is a personal project; favor straightforward, maintainable implementations.
10. **Make changes incrementally.** Explain which files need modification, implement one feature at a time, and provide commands to test it.
11. **Do not assume a feature is implemented just because it is described here as planned.** Verify the code.
12. **Do not change the database schema without explaining the migration implications.**
13. **Do not expose `.env` values, credentials or database connection strings.**

## 11. Immediate next steps

Start by inspecting:
- `prisma/schema.prisma`
- `web/app/page.tsx`
- `web/app/components/MovieCatalog.tsx`
- `web/lib/prisma.ts`
- `web/package.json`
- Root `package.json`

Then proceed with:

**Step 1 – Collection display**
- Add the selector `Film singoli | Collection`.
- Implement collection cards.
- Implement a collection detail view.
- Show collection membership on individual movie cards.
- Handle standalone editions and movies belonging to multiple collections.

**Step 2 – Add movie form**
- Add the `Aggiungi film` entry point.
- Implement the three form sections: Movie, PhysicalEdition and optional Collection.
- Add duplicate detection and reuse of existing movies.
- Save all related data transactionally.
- Refresh the catalogue after a successful save.

**Step 3 – Verify existing functionality**
- Check the Film / Serie TV filter.
- Check statistics.
- Check cover fallback behavior.
- Check existing search, filters and sorting in both display modes.

The goal is to evolve MovieShelf as a practical personal catalogue, keeping the existing data and relationships intact.