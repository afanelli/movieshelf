"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMovie } from "../actions";

export type EditableMovie = {
  id: string;
  title: string;
  year: number | null;
  director: string | null;
  mediaType: "MOVIE" | "TV_SERIES";
  editions: {
    id: string;
    format: string;
    barcode: string | null;
    coverUrl: string | null;
    seasonNumber: string | null;
    editionType: string;
    editionTitle: string | null;
    quantity: number;
    isBoxSet: boolean;
    collectionName: string | null;
    collection: {
      id: string;
      name: string;
      coverUrl: string | null;
    } | null;
  }[];
};

const fieldClassName =
  "mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400";

export default function EditMovieForm({
  movie,
  instanceId = movie.id,
}: {
  movie: EditableMovie;
  instanceId?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mediaType, setMediaType] = useState(movie.mediaType);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const result = await updateMovie(new FormData(event.currentTarget));
      if (result.kind === "error") {
        setMessage(result.message);
        return;
      }

      setMessage(`“${result.title}” aggiornato.`);
      setIsSuccess(true);
      router.refresh();
    } catch {
      setMessage("Modifica non riuscita. Controlla i dati e riprova.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMediaType(movie.mediaType);
          setMessage("");
          setIsSuccess(false);
          setIsOpen(true);
        }}
        className="mt-3 rounded border border-slate-500 px-3 py-1 text-sm font-medium hover:bg-slate-800"
      >
        Modifica
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-movie-title-${instanceId}`}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 id={`edit-movie-title-${instanceId}`} className="text-xl font-bold text-white">
                Modifica film
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
              >
                Chiudi
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="hidden" name="movieId" value={movie.id} />
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-base font-semibold text-white">Dati del film</legend>
                <label className="text-sm text-slate-200 sm:col-span-2">
                  Titolo *
                  <input
                    name="title"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={movie.title}
                    className={fieldClassName}
                  />
                </label>
                <label className="text-sm text-slate-200">
                  Tipo
                  <select
                    name="mediaType"
                    value={mediaType}
                    onChange={(event) => setMediaType(event.target.value as EditableMovie["mediaType"])}
                    className={fieldClassName}
                  >
                    <option value="MOVIE">Film</option>
                    <option value="TV_SERIES">Serie TV</option>
                  </select>
                </label>
                <label className="text-sm text-slate-200">
                  Anno
                  <input
                    name="year"
                    type="number"
                    min="1"
                    max="9999"
                    defaultValue={movie.year ?? ""}
                    className={fieldClassName}
                  />
                </label>
                <label className="text-sm text-slate-200 sm:col-span-2">
                  Regista
                  <input
                    name="director"
                    type="text"
                    maxLength={200}
                    defaultValue={movie.director ?? ""}
                    className={fieldClassName}
                  />
                </label>
              </fieldset>

              {movie.editions.map((edition, index) => (
                <fieldset key={edition.id} className="grid gap-4 rounded border border-slate-700 p-4 sm:grid-cols-2">
                  <legend className="px-2 text-base font-semibold text-white">
                    Edizione {index + 1}{edition.collection ? ` · ${edition.collection.name}` : ""}
                  </legend>
                  <input type="hidden" name="editionId" value={edition.id} />
                  <label className="text-sm text-slate-200">
                    Formato
                    <select
                      name={`edition.${edition.id}.format`}
                      defaultValue={edition.format}
                      className={fieldClassName}
                    >
                      <option value="DVD">DVD</option>
                      <option value="BLURAY">Blu-ray</option>
                      <option value="UHD4K">4K UHD</option>
                      <option value="HDDVD">HD DVD</option>
                      <option value="VHS">VHS</option>
                      <option value="OTHER">Altro</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-200">
                    Barcode
                    <input
                      name={`edition.${edition.id}.barcode`}
                      type="text"
                      maxLength={64}
                      defaultValue={edition.barcode ?? ""}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="text-sm text-slate-200">
                    Tipo edizione
                    <select
                      name={`edition.${edition.id}.editionType`}
                      defaultValue={edition.editionType}
                      className={fieldClassName}
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="STEELBOOK">Steelbook</option>
                      <option value="COLLECTOR">Collector</option>
                      <option value="DIGIBOOK">Digibook</option>
                      <option value="LIMITED">Limited</option>
                      <option value="OTHER">Altro</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-200">
                    Quantità
                    <input
                      name={`edition.${edition.id}.quantity`}
                      type="number"
                      min="1"
                      defaultValue={edition.quantity}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="text-sm text-slate-200 sm:col-span-2">
                    Titolo edizione
                    <input
                      name={`edition.${edition.id}.editionTitle`}
                      type="text"
                      maxLength={200}
                      defaultValue={edition.editionTitle ?? ""}
                      className={fieldClassName}
                    />
                  </label>
                  {mediaType === "TV_SERIES" && (
                    <label className="text-sm text-slate-200">
                      Stagione
                      <input
                        name={`edition.${edition.id}.seasonNumber`}
                        type="text"
                        maxLength={40}
                        defaultValue={edition.seasonNumber ?? ""}
                        className={fieldClassName}
                      />
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-200 sm:col-span-2">
                    <input
                      name={`edition.${edition.id}.isBoxSet`}
                      type="checkbox"
                      defaultChecked={edition.isBoxSet}
                      className="h-4 w-4"
                    />
                    Questa edizione è un cofanetto
                  </label>
                  <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                    <label className="text-sm text-slate-200">
                      Copertina attuale (URL o /covers/...)
                      <input
                        name={`edition.${edition.id}.coverUrl`}
                        type="text"
                        defaultValue={edition.coverUrl ?? ""}
                        className={fieldClassName}
                        onChange={(event) => {
                          if (!event.currentTarget.value) return;
                          const file = event.currentTarget.form?.elements.namedItem(`edition.${edition.id}.coverFile`);
                          if (file instanceof HTMLInputElement) file.value = "";
                        }}
                      />
                    </label>
                    <label className="text-sm text-slate-200">
                      Sostituisci copertina
                      <input
                        name={`edition.${edition.id}.coverFile`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className={`${fieldClassName} file:mr-3 file:rounded file:border-0 file:bg-slate-600 file:px-3 file:py-1 file:text-sm file:text-white`}
                        onChange={(event) => {
                          if (!event.currentTarget.files?.length) return;
                          const url = event.currentTarget.form?.elements.namedItem(`edition.${edition.id}.coverUrl`);
                          if (url instanceof HTMLInputElement) url.value = "";
                        }}
                      />
                    </label>
                  </div>
                </fieldset>
              ))}

              {movie.editions.length === 0 && (
                <p className="text-sm text-slate-300">
                  Questo film non ha edizioni fisiche associate.
                </p>
              )}

              {message && (
                <p
                  role={isSuccess ? "status" : "alert"}
                  className={isSuccess ? "text-sm text-emerald-300" : "text-sm text-red-300"}
                >
                  {message}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {isPending ? "Salvataggio..." : "Salva modifiche"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}