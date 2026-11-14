import { prisma } from "@/lib/prisma";
import MovieCatalog from "./components/MovieCatalog";

export default async function Home() {
  const [movies, collections, editionCount] = await Promise.all([
    prisma.movie.findMany({
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
        year: true,
        director: true,
        mediaType: true,
        editions: {
          select: {
            id: true,
            format: true,
            barcode: true,
            coverUrl: true,
            seasonNumber: true,
            editionType: true,
            editionTitle: true,
            quantity: true,
            isBoxSet: true,
            collectionName: true,

            collection: {
              select: {
                id: true,
                name: true,
                coverUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.collection.findMany({
      select: {
        id: true,
        name: true,
        coverUrl: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.physicalEdition.count(),
  ]);

  const movieCount = movies.filter(
    m => m.mediaType === "MOVIE"
  ).length;

  const tvCount = movies.filter(
    m => m.mediaType === "TV_SERIES"
  ).length;

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          🎬 MovieShelf
        </h1>

        <p className="text-gray-600 mt-2">
          🎬 {movieCount} film · 📺 {tvCount} serie TV · 💿 {editionCount} edizioni fisiche
        </p>
      </div>

      <MovieCatalog movies={movies} collections={collections} />
    </main>
  );
}