"use client";

import { useMemo, useState } from "react";
import AddCatalogItem from "./AddCatalogItem";
import EditMovieForm, { type EditableMovie } from "./EditMovieForm";

type Movie = EditableMovie;
type MovieEdition = Movie["editions"][number];
type MovieEditionEntry = { movie: Movie; edition: MovieEdition | null };

type CollectionSummary = {
  id: string;
  name: string;
  coverUrl: string | null;
  movieCount: number;
  movieIds: Set<string>;
  movies: Movie[];
};

type CollectionRecord = Pick<CollectionSummary, "id" | "name" | "coverUrl">;

function buildCollections(
  items: Movie[],
  knownCollections: CollectionRecord[] = []
): CollectionSummary[] {
  const groups = new Map<string, CollectionSummary>();

  for (const movie of items) {
    for (const edition of movie.editions) {
      if (!edition.collection) continue;

      const key = edition.collection.id || edition.collection.name;
      const existing = groups.get(key);

      if (existing) {
        existing.movieIds.add(movie.id);
        if (!existing.movies.some((item) => item.id === movie.id)) {
          existing.movies.push(movie);
        }
        if (!existing.coverUrl) {
          existing.coverUrl = edition.collection.coverUrl;
        }
        continue;
      }

      groups.set(key, {
        id: edition.collection.id || key,
        name: edition.collection.name,
        coverUrl: edition.collection.coverUrl,
        movieCount: 0,
        movieIds: new Set([movie.id]),
        movies: [movie],
      });
    }
  }

  for (const collection of knownCollections) {
    if (groups.has(collection.id)) continue;

    groups.set(collection.id, {
      ...collection,
      movieCount: 0,
      movieIds: new Set(),
      movies: [],
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    movieCount: group.movieIds.size,
  }));
}

function sortMovies(items: Movie[], sort: string) {
  return [...items].sort((a, b) => {
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
}

function expandMovieEditions(movies: Movie[], standaloneOnly = false): MovieEditionEntry[] {
  const entries: MovieEditionEntry[] = [];

  for (const movie of movies) {
    if (movie.editions.length === 0) {
      entries.push({ movie, edition: null });
      continue;
    }

    for (const edition of movie.editions) {
      if (standaloneOnly && edition.collection) continue;
      entries.push({ movie, edition });
    }
  }

  return entries;
}

function sortCollections(items: CollectionSummary[], sort: string) {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "TITLE_DESC":
        return b.name.localeCompare(a.name);
      case "YEAR_DESC":
        return b.movieCount - a.movieCount;
      case "YEAR_ASC":
        return a.movieCount - b.movieCount;
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

export default function MovieCatalog({
  movies,
  collections,
}: {
  movies: Movie[];
  collections: CollectionRecord[];
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [displayMode, setDisplayMode] = useState<"all" | "collections">("all");
  const [showCollectionCards, setShowCollectionCards] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<CollectionSummary | null>(null);
  const [collectionAddRequest, setCollectionAddRequest] = useState<{
    requestId: number;
    collection: CollectionRecord;
  } | null>(null);
  const [mediaType, setMediaType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("ALL");
  const [coverFilter, setCoverFilter] = useState("ALL");
  const [sort, setSort] = useState("TITLE_ASC");

  const filteredMovies = useMemo(
    () =>
      sortMovies(
        movies
          .filter((movie) =>
            movie.title.toLowerCase().includes(search.toLowerCase())
          )
          .filter((movie) => {
            if (mediaType === "ALL") return true;

            return movie.mediaType === mediaType;
          })
          .map((movie) => ({
            ...movie,
            editions: movie.editions.filter((edition) => {
              if (format !== "ALL" && edition.format !== format) return false;
              if (coverFilter === "ALL") return true;

              const hasCover = Boolean(edition.coverUrl || edition.collection?.coverUrl);
              return coverFilter === "WITH_COVER" ? hasCover : !hasCover;
            }),
          }))
          .filter((movie) =>
            format === "ALL" && coverFilter === "ALL"
              ? true
              : movie.editions.length > 0
          ),
        sort
      ),
    [coverFilter, format, mediaType, movies, search, sort]
  );

  const filteredMovieEntries = useMemo(
    () => expandMovieEditions(filteredMovies),
    [filteredMovies]
  );
  const standaloneMovieEntries = useMemo(
    () => expandMovieEditions(filteredMovies, true),
    [filteredMovies]
  );
  const allMovieEntryCount = useMemo(() => expandMovieEditions(movies).length, [movies]);
  const allStandaloneMovieEntryCount = useMemo(
    () => expandMovieEditions(movies, true).length,
    [movies]
  );

  const allCollections = useMemo(
    () => sortCollections(buildCollections(movies, collections), sort),
    [collections, movies, sort]
  );
  const filteredCollections = useMemo(
    () => {
      const collectionsWithMatchingMovies = new Set(
        buildCollections(filteredMovies).map((collection) => collection.id)
      );
      const normalizedSearch = search.toLowerCase();

      return sortCollections(
        allCollections.filter((collection) =>
          !normalizedSearch ||
          collection.name.toLowerCase().includes(normalizedSearch) ||
          collectionsWithMatchingMovies.has(collection.id)
        ),
        sort
      );
    },
    [allCollections, filteredMovies, search, sort]
  );

  const selectedCollectionMovies = useMemo(() => {
    return selectedCollection?.movies ?? [];
  }, [selectedCollection]);

  const totalDisplayCount =
    displayMode === "collections"
      ? filteredCollections.length
      : showCollectionCards
        ? filteredCollections.length + standaloneMovieEntries.length
        : filteredMovieEntries.length;

  const totalDatasetCount =
    displayMode === "collections"
      ? allCollections.length
      : showCollectionCards
        ? allCollections.length + allStandaloneMovieEntryCount
        : allMovieEntryCount;

  const renderCollectionCard = (collection: CollectionSummary, compact = false) => {
    const collectionCover = collection.coverUrl;

    if (compact) {
      return (
        <button
          key={collection.id}
          type="button"
          onClick={() => setSelectedCollection(collection)}
          className="flex w-full items-center gap-4 border rounded-lg p-3 text-left text-foreground"
        >
          {collectionCover ? (
            <img
              src={collectionCover}
              alt={collection.name}
              className="w-20 h-28 object-cover rounded"
            />
          ) : (
            <div className="w-20 h-28 bg-gray-200 flex items-center justify-center text-xs text-slate-600">
              No cover
            </div>
          )}

          <div>
            <h2 className="font-bold text-lg text-foreground">{collection.name}</h2>
            <p className="text-sm text-foreground opacity-75">{collection.movieCount} film</p>
          </div>
        </button>
      );
    }

    return (
      <button
        key={collection.id}
        type="button"
        onClick={() => setSelectedCollection(collection)}
        className="border rounded-lg p-3 text-left text-foreground transition hover:shadow-md"
      >
        {collectionCover ? (
          <img
            src={collectionCover}
            alt={collection.name}
            className="w-full aspect-[2/3] object-cover rounded"
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center text-slate-600">
            No cover
          </div>
        )}

        <h2 className="font-bold mt-3 text-foreground">{collection.name}</h2>
        <p className="text-sm text-foreground opacity-75">{collection.movieCount} film</p>
      </button>
    );
  };

  const renderMovieCard = ({ movie, edition }: MovieEditionEntry) => {
    const cover = edition?.coverUrl ?? edition?.collection?.coverUrl ?? null;

    return (
      <div key={edition?.id ?? movie.id} className="border rounded-lg p-3">
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

        <h2 className="font-bold mt-3">{movie.title}</h2>
        {movie.mediaType === "TV_SERIES" && edition?.seasonNumber && (
          <p className="text-sm">Stagione: {edition.seasonNumber}</p>
        )}
        <p className="text-sm">{movie.year}</p>
        <p className="text-sm">{movie.director}</p>

        {edition ? (
          <div className="mt-2 text-xs text-slate-600">
            <p>{edition.format}{edition.editionTitle ? ` · ${edition.editionTitle}` : ""}</p>
            <p>Barcode: {edition.barcode ?? "Non disponibile"}</p>
            {edition.collection && <p>Collection: {edition.collection.name}</p>}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Nessuna edizione fisica</p>
        )}
        <EditMovieForm movie={movie} instanceId={edition?.id ?? movie.id} />
      </div>
    );
  };

  const renderMovieListItem = ({ movie, edition }: MovieEditionEntry) => {
    const cover = edition?.coverUrl ?? edition?.collection?.coverUrl ?? null;

    return (
      <div key={edition?.id ?? movie.id} className="flex gap-4 border rounded-lg p-3">
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
          <h2 className="font-bold text-lg">{movie.title}</h2>
          {movie.mediaType === "TV_SERIES" && edition?.seasonNumber && (
            <p className="text-sm">Stagione: {edition.seasonNumber}</p>
          )}
          <p>{movie.year}</p>
          <p>{movie.director}</p>
          {edition ? (
            <div className="mt-2 text-sm text-slate-600">
              <p>{edition.format}{edition.editionTitle ? ` · ${edition.editionTitle}` : ""}</p>
              <p>Barcode: {edition.barcode ?? "Non disponibile"}</p>
              {edition.collection && <p>Collection: {edition.collection.name}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Nessuna edizione fisica</p>
          )}
          <EditMovieForm movie={movie} instanceId={edition?.id ?? movie.id} />
        </div>
      </div>
    );
  };

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
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="border rounded p-2"
        >
          <option value="ALL">Tutti</option>
          <option value="MOVIE">🎬 Film</option>
          <option value="TV_SERIES">📺 Serie TV</option>
        </select>

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
          className="border rounded p-2 md:col-span-1"
        >
          <option value="TITLE_ASC">Titolo A-Z</option>
          <option value="TITLE_DESC">Titolo Z-A</option>
          <option value="YEAR_DESC">Anno più recente</option>
          <option value="YEAR_ASC">Anno più vecchio</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setDisplayMode("all")}
            className={`px-4 py-2 rounded border ${
              displayMode === "all" ? "bg-black text-white" : ""
            }`}
          >
            🔍 Tutti
          </button>
          <button
            onClick={() => setDisplayMode("collections")}
            className={`px-4 py-2 rounded border ${
              displayMode === "collections" ? "bg-black text-white" : ""
            }`}
          >
            📚 Collezioni
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView("grid")}
            className={`px-4 py-2 rounded border ${
              view === "grid" ? "bg-black text-white" : ""
            }`}
          >
            🖼️ Copertine
          </button>

          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded border ${
              view === "list" ? "bg-black text-white" : ""
            }`}
          >
            📋 Lista
          </button>
        </div>

        <AddCatalogItem
          key={collectionAddRequest?.requestId ?? 0}
          collections={collections}
          requestedCollection={collectionAddRequest?.collection}
        />
      </div>

      {displayMode === "all" && (
        <div className="mb-4 flex items-center gap-2">
          <input
            id="show-collections-toggle"
            type="checkbox"
            checked={showCollectionCards}
            onChange={(e) => setShowCollectionCards(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="show-collections-toggle" className="text-sm text-slate-700">
            Mostra le collezioni come boxset nella vista completa
          </label>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        {displayMode === "collections"
          ? `Collezioni visualizzate: ${totalDisplayCount} / ${totalDatasetCount}`
          : `Visualizzati: ${totalDisplayCount} / ${totalDatasetCount}`}
      </p>

      {(displayMode === "collections" || displayMode === "all") && (
        <>
          {displayMode === "collections" && (
            view === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {filteredCollections.map((collection) => renderCollectionCard(collection))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCollections.map((collection) => renderCollectionCard(collection, true))}
              </div>
            )
          )}

          {selectedCollection && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
              <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-2xl font-bold text-white">{selectedCollection.name}</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCollection(null)}
                    className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-100 hover:bg-slate-700"
                  >
                    Chiudi
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {selectedCollectionMovies.map((movie) => {
                    const cover =
                      movie.editions.find((edition) => edition.coverUrl)?.coverUrl ??
                      movie.editions.find((edition) => edition.collection?.coverUrl)?.collection?.coverUrl ??
                      null;

                    return (
                      <div key={movie.id} className="flex gap-3 rounded border border-slate-700 bg-slate-800 p-3 text-slate-100">
                        {cover ? (
                          <img src={cover} alt={movie.title} className="h-24 w-16 object-cover rounded" />
                        ) : (
                          <div className="flex h-24 w-16 items-center justify-center rounded bg-slate-700 text-[10px] font-medium text-slate-200">
                            No cover
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold text-white">{movie.title}</h4>
                          {movie.mediaType === "TV_SERIES" && (() => {
                            const seasonNumbers = Array.from(new Set(
                              movie.editions
                                .filter((edition) => edition.collection?.id === selectedCollection.id)
                                .map((edition) => edition.seasonNumber)
                                .filter((season): season is string => Boolean(season))
                            ));

                            return seasonNumbers.length > 0 ? (
                              <p className="text-sm text-slate-300">
                                Stagione: {seasonNumbers.join(", ")}
                              </p>
                            ) : null;
                          })()}
                          <p className="text-sm text-slate-300">{movie.year}</p>
                          <p className="text-sm text-slate-300">{movie.director}</p>
                          <EditMovieForm movie={movie} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollection(null);
                      setCollectionAddRequest((request) => ({
                        requestId: (request?.requestId ?? 0) + 1,
                        collection: {
                          id: selectedCollection.id,
                          name: selectedCollection.name,
                          coverUrl: selectedCollection.coverUrl,
                        },
                      }));
                    }}
                    className="rounded border border-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    + Aggiungi film
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {displayMode === "all" && (
        <>
          {showCollectionCards && filteredCollections.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Collezioni</h3>
              {view === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {filteredCollections.map((collection) => renderCollectionCard(collection))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCollections.map((collection) => renderCollectionCard(collection, true))}
                </div>
              )}
            </div>
          )}

          <div>
            {view === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {standaloneMovieEntries.map((entry) => renderMovieCard(entry))}
              </div>
            ) : (
              <div className="space-y-3">
                {standaloneMovieEntries.map((entry) => renderMovieListItem(entry))}
              </div>
            )}
          </div>
        </>
      )}

    </>
  );
}