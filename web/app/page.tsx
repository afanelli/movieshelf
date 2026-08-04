import { prisma } from "@/lib/prisma";
import MovieCatalog from "./components/MovieCatalog";

export default async function Home() {
  const movies = await prisma.movie.findMany({
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      title: true,
      year: true,
      director: true,
      editions: {
        select: {
          id: true,
          format: true,
          barcode: true,
          coverUrl: true,
          isBoxSet: true,
          collectionName: true,

          collection: {
            select: {
              name: true,
              coverUrl: true,
            },
          },
        },
      },
    },
  });

  const movieCount = movies.length;

  const editionCount = movies.reduce(
    (total, movie) => total + movie.editions.length,
    0
  );

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          🎬 MovieShelf
        </h1>

        <p className="text-gray-600 mt-2">
          {movieCount} film · {editionCount} edizioni fisiche
        </p>
      </div>

      <MovieCatalog movies={movies} />
    </main>
  );
}