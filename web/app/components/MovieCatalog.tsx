"use client";

import { useState } from "react";

type Movie = {
  id: string;
  title: string;
  year: number | null;
  director: string | null;
  editions: {
    id: string;
    format: string;
    barcode: string | null;
    coverUrl: string | null;
    isBoxSet: boolean;
    collectionName: string | null;
  }[];
};

export default function MovieCatalog({
  movies,
}: {
  movies: Movie[];
}) {
  
  const [view, setView] = useState<"grid" | "list">("grid");

  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("ALL");
  const [coverFilter, setCoverFilter] = useState("ALL");
  const [sort, setSort] = useState("TITLE_ASC");

  const filteredMovies = movies
  .filter((movie) =>
    movie.title
      .toLowerCase()
      .includes(search.toLowerCase())
  )
  .filter((movie) => {
    if (format === "ALL") return true;

    return movie.editions.some(
      (edition) => edition.format === format
    );
  })
  .filter((movie) => {
    if (coverFilter === "ALL") return true;

    const hasCover = movie.editions.some(
      (edition) => edition.coverUrl
    );

    return coverFilter === "WITH_COVER"
      ? hasCover
      : !hasCover;
  })
  .sort((a, b) => {
    switch (sort) {
      case "TITLE_DESC":
        return b.title.localeCompare(a.title);

      case "YEAR_DESC":
        return (b.year ?? 0) - (a.year ?? 0);

      case "YEAR_ASC":
        return (a.year ?? 0) - (b.year ?? 0);

      default:
        return a.title.localeCompare(b.title);
    }
  });

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

  <input
    type="text"
    placeholder="🔍 Cerca film..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="border rounded p-2"
  />

  <select
    value={format}
    onChange={(e) => setFormat(e.target.value)}
    className="border rounded p-2"
  >
    <option value="ALL">Tutti i formati</option>
    <option value="DVD">DVD</option>
    <option value="BLURAY">Blu-ray</option>
    <option value="UHD4K">4K UHD</option>
  </select>


  <select
    value={coverFilter}
    onChange={(e) => setCoverFilter(e.target.value)}
    className="border rounded p-2"
  >
    <option value="ALL">Tutte le cover</option>
    <option value="WITH_COVER">Con cover</option>
    <option value="WITHOUT_COVER">Senza cover</option>
  </select>


  <select
    value={sort}
    onChange={(e) => setSort(e.target.value)}
    className="border rounded p-2"
  >
    <option value="TITLE_ASC">Titolo A-Z</option>
    <option value="TITLE_DESC">Titolo Z-A</option>
    <option value="YEAR_DESC">Anno più recente</option>
    <option value="YEAR_ASC">Anno più vecchio</option>
  </select>

</div>


<p className="text-sm text-gray-500 mb-4">
  Visualizzati: {filteredMovies.length} / {movies.length}
</p>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView("grid")}
          className={`px-4 py-2 rounded border ${
            view === "grid"
              ? "bg-black text-white"
              : ""
          }`}
        >
          🖼️ Copertine
        </button>

        <button
          onClick={() => setView("list")}
          className={`px-4 py-2 rounded border ${
            view === "list"
              ? "bg-black text-white"
              : ""
          }`}
        >
          📋 Lista
        </button>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredMovies.map((movie) => {
            const cover = movie.editions.find(
              (e) => e.coverUrl
            )?.coverUrl;

            return (
              <div
                key={movie.id}
                className="border rounded-lg p-3"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover rounded"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
                    No cover
                  </div>
                )}

                <h2 className="font-bold mt-3">
                  {movie.title}
                </h2>

                <p className="text-sm">
                  {movie.year}
                </p>

                <p className="text-sm">
                  {movie.director}
                </p>

                <p className="text-xs mt-2">
                  Edizioni: {movie.editions.length}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMovies.map((movie) => {
            const cover = movie.editions.find(
              (e) => e.coverUrl
            )?.coverUrl;

            return (
              <div
                key={movie.id}
                className="flex gap-4 border rounded-lg p-3"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={movie.title}
                    className="w-20 h-28 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-28 bg-gray-200 flex items-center justify-center text-xs">
                    No cover
                  </div>
                )}

                <div>
                  <h2 className="font-bold text-lg">
                    {movie.title}
                  </h2>

                  <p>
                    {movie.year}
                  </p>

                  <p>
                    {movie.director}
                  </p>

                  <p className="text-sm mt-2">
                    💿 {movie.editions.length} edizione/i
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}