"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createCollection, saveMovie } from "../actions";

type CollectionOption = {
  id: string;
  name: string;
  barcode: string | null;
  coverUrl: string | null;
};

type MovieMatch = {
  id: string;
  title: string;
  year: number | null;
  director: string | null;
};

type CollectionChoice = {
  id: string;
  name: string;
  coverUrl: string | null;
};

type Flow = "choose" | "single" | "collectionDetails" | "collectionItems";

const fieldClassName =
  "mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400";

function CoverFields({
  label,
  urlName,
  fileName,
}: {
  label: string;
  urlName: string;
  fileName: string;
}) {
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <label className="text-sm text-slate-200">
        {label} URL
        <input
          name={urlName}
          type="text"
          maxLength={2048}
          placeholder="https://..."
          className={fieldClassName}
          onChange={(event) => {
            if (!event.currentTarget.value) return;
            const fileInput = event.currentTarget.form?.elements.namedItem(fileName);
            if (fileInput instanceof HTMLInputElement) fileInput.value = "";
          }}
        />
      </label>
      <label className="text-sm text-slate-200">
        Carica immagine
        <input
          name={fileName}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={`${fieldClassName} file:mr-3 file:rounded file:border-0 file:bg-slate-600 file:px-3 file:py-1 file:text-sm file:text-white`}
          onChange={(event) => {
            if (!event.currentTarget.files?.length) return;
            const urlInput = event.currentTarget.form?.elements.namedItem(urlName);
            if (urlInput instanceof HTMLInputElement) urlInput.value = "";
          }}
        />
      </label>
      <p className="text-xs text-slate-400 sm:col-span-2">
        L’URL verrà scaricato e salvato in locale. Formati: JPEG, PNG o WebP; massimo 8 MB.
      </p>
    </div>
  );
}

export default function AddCatalogItem({
  collections,
  requestedCollection = null,
}: {
  collections: CollectionChoice[];
  requestedCollection?: CollectionChoice | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(Boolean(requestedCollection));
  const [flow, setFlow] = useState<Flow>(requestedCollection ? "collectionItems" : "choose");
  const [mediaType, setMediaType] = useState("MOVIE");
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [matches, setMatches] = useState<MovieMatch[]>([]);
  const [activeCollection, setActiveCollection] = useState<CollectionOption | null>(
    requestedCollection ? { ...requestedCollection, barcode: null } : null
  );
  const [existingCollection, setExistingCollection] = useState<CollectionOption | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [addedTitles, setAddedTitles] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isPending, setIsPending] = useState(false);

  function resetFlow() {
    setFlow("choose");
    setMediaType("MOVIE");
    setSelectedMovieId("");
    setMatches([]);
    setActiveCollection(null);
    setExistingCollection(null);
    setSelectedCollectionId("");
    setAddedTitles([]);
    setMessage("");
    setMessageType("success");
  }

  function closeForm() {
    setIsOpen(false);
    resetFlow();
  }

  function activateCollection(collection: CollectionOption) {
    setActiveCollection(collection);
    setExistingCollection(null);
    setFlow("collectionItems");
    setMessage(`Collection “${collection.name}” selezionata. Aggiungi i film che ne fanno parte.`);
    setMessageType("success");
    router.refresh();
  }

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsPending(true);
    setMessage("");
    setExistingCollection(null);

    try {
      const result = await createCollection(formData);

      if (result.kind === "error") {
        setMessage(result.message);
        setMessageType("error");
        return;
      }

      if (result.kind === "existing") {
        setExistingCollection(result.collection);
        setMessage(`Esiste già una collection chiamata “${result.collection.name}”.`);
        setMessageType("error");
        return;
      }

      activateCollection(result.collection);
    } catch {
      setMessage("Creazione della collection non riuscita. Riprova.");
      setMessageType("error");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSaveEdition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsPending(true);
    setMessage("");

    try {
      const result = await saveMovie(formData);

      if (result.kind === "duplicateBarcode") {
        setMatches([]);
        setSelectedMovieId("");
        setMessage(
          `Questo barcode è già registrato per “${result.existingTitle}” (${result.existingFormat})${
            result.existingCollection ? ` nella collection “${result.existingCollection}”` : ""
          }.`
        );
        setMessageType("error");
        return;
      }

      if (result.kind === "duplicates") {
        setMatches(result.matches);
        setSelectedMovieId("");
        setMessage("Il titolo esiste già. Seleziona il film a cui associare questa edizione.");
        setMessageType("error");
        return;
      }

      if (result.kind === "error") {
        setMessage(result.message);
        setMessageType("error");
        return;
      }

      setMatches([]);
      setSelectedMovieId("");
      setMessage(
        result.reusedMovie
          ? `Nuova edizione aggiunta a “${result.title}”.`
          : `“${result.title}” aggiunto al catalogo.`
      );
      setMessageType("success");
      if (flow === "collectionItems") {
        setAddedTitles((titles) => [...titles, result.title]);
      }
      form.reset();
      setMediaType("MOVIE");
      router.refresh();
    } catch {
      setMessage("Salvataggio non riuscito. Controlla i dati e riprova.");
      setMessageType("error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetFlow();
          setIsOpen(true);
        }}
        className="rounded border border-slate-700 bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
      >
        + Aggiungi film / boxset
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-catalog-item-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {flow !== "choose" && flow !== "collectionItems" && (
                  <button
                    type="button"
                    onClick={() => {
                      setFlow("choose");
                      setMessage("");
                    }}
                    className="rounded border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
                  >
                    Indietro
                  </button>
                )}
                <h2 id="add-catalog-item-title" className="text-xl font-bold text-white">
                  {flow === "choose" ? "Cosa vuoi aggiungere?" :
                    flow === "single" ? "Aggiungi un film singolo" :
                      flow === "collectionDetails" ? "Crea una collection" :
                        activeCollection?.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Chiudi il modulo"
                className="rounded border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
              >
                Chiudi
              </button>
            </div>

            {flow === "choose" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFlow("single")}
                  className="rounded border border-slate-600 p-5 text-left hover:border-white hover:bg-slate-800"
                >
                  <span className="block text-lg font-semibold text-white">Film singolo</span>
                  <span className="mt-1 block text-sm text-slate-300">Aggiungi un film e la sua edizione fisica.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlow("collectionDetails")}
                  className="rounded border border-slate-600 p-5 text-left hover:border-white hover:bg-slate-800"
                >
                  <span className="block text-lg font-semibold text-white">Boxset / Collection</span>
                  <span className="mt-1 block text-sm text-slate-300">Crea prima il cofanetto, poi aggiungi i film contenuti.</span>
                </button>
              </div>
            )}

            {flow === "collectionDetails" && (
              <div className="space-y-5">
                {collections.length > 0 && (
                  <div className="grid gap-3 rounded border border-slate-700 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="text-sm text-slate-200">
                      Aggiungi film a una collection esistente
                      <select
                        value={selectedCollectionId}
                        onChange={(event) => setSelectedCollectionId(event.target.value)}
                        className={fieldClassName}
                      >
                        <option value="">Seleziona una collection</option>
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={!selectedCollectionId}
                      onClick={() => {
                        const collection = collections.find((item) => item.id === selectedCollectionId);
                        if (collection) {
                          activateCollection({ ...collection, barcode: null });
                        }
                      }}
                      className="rounded border border-slate-500 px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Aggiungi film
                    </button>
                  </div>
                )}

                {collections.length > 0 && (
                  <p className="text-center text-sm text-slate-400">Oppure crea una nuova collection</p>
                )}

                <form onSubmit={handleCreateCollection} className="space-y-5">
                <fieldset className="grid gap-4 sm:grid-cols-2">
                  <legend className="mb-3 text-base font-semibold text-white">
                    Dati del boxset
                  </legend>
                  <label className="text-sm text-slate-200 sm:col-span-2">
                    Nome collection *
                    <input
                      name="name"
                      type="text"
                      required
                      maxLength={200}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="text-sm text-slate-200">
                    Barcode del boxset
                    <input name="barcode" type="text" maxLength={64} className={fieldClassName} />
                  </label>
                  <CoverFields
                    label="Copertina collection"
                    urlName="coverUrl"
                    fileName="coverFile"
                  />
                </fieldset>

                {message && (
                  <p
                    role={messageType === "success" ? "status" : "alert"}
                    className={messageType === "success" ? "text-sm text-emerald-300" : "text-sm text-red-300"}
                  >
                    {message}
                  </p>
                )}

                {existingCollection && (
                  <button
                    type="button"
                    onClick={() => activateCollection(existingCollection)}
                    className="rounded border border-amber-400 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-slate-800"
                  >
                    Usa “{existingCollection.name}” e aggiungi film
                  </button>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isPending ? "Salvataggio..." : "Crea collection"}
                  </button>
                </div>
                </form>
              </div>
            )}

            {(flow === "single" || flow === "collectionItems") && (
              <div className="space-y-5">
                {flow === "collectionItems" && activeCollection && (
                  <div className="rounded border border-slate-700 bg-slate-800 p-4">
                    <p className="font-semibold text-white">{activeCollection.name}</p>
                    <p className="text-sm text-slate-300">
                      {addedTitles.length === 0
                        ? "Nessun film aggiunto in questa sessione."
                        : `${addedTitles.length} film aggiunti in questa sessione.`}
                    </p>
                    {addedTitles.length > 0 && (
                      <ul className="mt-3 list-inside list-disc text-sm text-slate-200">
                        {addedTitles.map((title, index) => <li key={`${title}-${index}`}>{title}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <form key={flow} onSubmit={handleSaveEdition} className="space-y-5">
                  {flow === "collectionItems" && activeCollection && (
                    <input
                      type="hidden"
                      name="collectionId"
                      defaultValue={activeCollection.id}
                    />
                  )}

                  <fieldset className="grid gap-4 sm:grid-cols-2">
                    <legend className="mb-3 text-base font-semibold text-white">
                      Titolo e edizione fisica
                    </legend>
                    <label className="text-sm text-slate-200 sm:col-span-2">
                      Titolo del film o della serie *
                      <input
                        name="title"
                        type="text"
                        required
                        maxLength={200}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="text-sm text-slate-200">
                      Tipo
                      <select
                        name="mediaType"
                        value={mediaType}
                        onChange={(event) => setMediaType(event.target.value)}
                        className={fieldClassName}
                      >
                        <option value="MOVIE">Film</option>
                        <option value="TV_SERIES">Serie TV</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-200">
                      Anno
                      <input name="year" type="number" min="1" max="9999" className={fieldClassName} />
                    </label>
                    <label className="text-sm text-slate-200 sm:col-span-2">
                      Regista
                      <input name="director" type="text" maxLength={200} className={fieldClassName} />
                    </label>
                    <label className="text-sm text-slate-200">
                      Formato *
                      <select name="format" required defaultValue="BLURAY" className={fieldClassName}>
                        <option value="DVD">DVD</option>
                        <option value="BLURAY">Blu-ray</option>
                        <option value="UHD4K">4K UHD</option>
                        <option value="HDDVD">HD DVD</option>
                        <option value="VHS">VHS</option>
                        <option value="OTHER">Altro</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-200">
                      Barcode dell’edizione
                      <input name="barcode" type="text" maxLength={64} className={fieldClassName} />
                    </label>
                    {mediaType === "TV_SERIES" && (
                      <label className="text-sm text-slate-200">
                        Stagione
                        <input
                          name="seasonNumber"
                          type="text"
                          maxLength={40}
                          placeholder="Es. 1 o 6 - Parte 1"
                          className={fieldClassName}
                        />
                      </label>
                    )}
                    <CoverFields
                      label="Copertina dell’edizione"
                      urlName="editionCoverUrl"
                      fileName="editionCoverFile"
                    />
                  </fieldset>

                  {matches.length > 0 && (
                    <label className="block text-sm font-medium text-amber-200">
                      Seleziona il film già presente a cui aggiungere questa edizione:
                      <select
                        name="existingMovieId"
                        required
                        value={selectedMovieId}
                        onChange={(event) => setSelectedMovieId(event.target.value)}
                        className={fieldClassName}
                      >
                        <option value="" disabled>Seleziona un film esistente</option>
                        {matches.map((movie) => (
                          <option key={movie.id} value={movie.id}>
                            {movie.title}{movie.year ? ` (${movie.year})` : ""}
                            {movie.director ? ` · ${movie.director}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {message && (
                    <p
                      role={messageType === "success" ? "status" : "alert"}
                      className={messageType === "success" ? "text-sm text-emerald-300" : "text-sm text-red-300"}
                    >
                      {message}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-end gap-3">
                    {flow === "collectionItems" && (
                      <button
                        type="button"
                        onClick={closeForm}
                        className="rounded border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
                      >
                        Fine
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isPending || (matches.length > 0 && !selectedMovieId)}
                      className="rounded bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isPending
                        ? "Salvataggio..."
                        : matches.length
                          ? "Aggiungi edizione"
                          : flow === "collectionItems"
                            ? "Aggiungi film alla collection"
                            : "Salva film"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}