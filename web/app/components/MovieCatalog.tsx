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

  return (
    <>
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
          {movies.map((movie) => {
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
          {movies.map((movie) => {
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