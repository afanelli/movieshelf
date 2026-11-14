"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CoverImageError,
  removeSavedCover,
  saveCoverInput,
} from "@/lib/cover-images";

const mediaTypes = ["MOVIE", "TV_SERIES"] as const;
const formats = ["DVD", "BLURAY", "UHD4K", "HDDVD", "VHS", "OTHER"] as const;

export async function createCollection(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const barcode = String(formData.get("barcode") ?? "").trim();

  if (!name) {
    return { kind: "error" as const, message: "Inserisci il nome della collection." };
  }

  let savedCover: Awaited<ReturnType<typeof saveCoverInput>> | null = null;
  try {
    const existing = await prisma.collection.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true, barcode: true, coverUrl: true },
    });

    if (existing) {
      const updateData: { barcode?: string; coverUrl?: string } = {};
      if (!existing.barcode && barcode) updateData.barcode = barcode;
      if (!existing.coverUrl) {
        savedCover = await saveCoverInput(formData, "coverUrl", "coverFile");
        if (savedCover.coverUrl) updateData.coverUrl = savedCover.coverUrl;
      }

      const collection = Object.keys(updateData).length
        ? await prisma.collection.update({
            where: { id: existing.id },
            data: updateData,
            select: { id: true, name: true, barcode: true, coverUrl: true },
          })
        : existing;

      savedCover = null;
      if (collection !== existing) revalidatePath("/");
      return { kind: "existing" as const, collection };
    }

    savedCover = await saveCoverInput(formData, "coverUrl", "coverFile");

    const collection = await prisma.collection.create({
      data: {
        name,
        barcode: barcode || null,
        coverUrl: savedCover.coverUrl,
      },
      select: { id: true, name: true, barcode: true, coverUrl: true },
    });

    savedCover = null;
    revalidatePath("/");
    return { kind: "created" as const, collection };
  } catch (error) {
    await removeSavedCover(savedCover?.filePath ?? null);
    return {
      kind: "error" as const,
      message: error instanceof CoverImageError
        ? error.message
        : "Creazione della collection non riuscita. Controlla i dati e riprova.",
    };
  }
}

export async function saveMovie(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const mediaType = String(formData.get("mediaType") ?? "");
  const format = String(formData.get("format") ?? "");
  const yearValue = String(formData.get("year") ?? "").trim();
  const director = String(formData.get("director") ?? "").trim();
  const barcode = String(formData.get("barcode") ?? "").trim();
  const seasonNumber = String(formData.get("seasonNumber") ?? "").trim();
  const collectionId = String(formData.get("collectionId") ?? "").trim();
  const existingMovieId = String(formData.get("existingMovieId") ?? "").trim();

  if (!title) return { kind: "error" as const, message: "Inserisci il titolo." };
  if (!mediaTypes.includes(mediaType as (typeof mediaTypes)[number])) {
    return { kind: "error" as const, message: "Seleziona un tipo di media valido." };
  }
  if (!formats.includes(format as (typeof formats)[number])) {
    return { kind: "error" as const, message: "Seleziona un formato valido." };
  }

  const year = yearValue ? Number(yearValue) : null;
  if (yearValue && (!Number.isInteger(year) || year! < 1 || year! > 9999)) {
    return { kind: "error" as const, message: "Inserisci un anno valido." };
  }

  let savedCover: Awaited<ReturnType<typeof saveCoverInput>> | null = null;
  try {
    savedCover = await saveCoverInput(formData, "editionCoverUrl", "editionCoverFile");
    const result = await prisma.$transaction(async (transaction) => {
      if (barcode) {
        const existingEdition = await transaction.physicalEdition.findFirst({
          where: { barcode },
          select: {
            format: true,
            movie: { select: { title: true } },
            collection: { select: { name: true } },
          },
        });

        if (existingEdition) {
          return {
            kind: "duplicateBarcode" as const,
            existingTitle: existingEdition.movie.title,
            existingFormat: existingEdition.format,
            existingCollection: existingEdition.collection?.name ?? null,
          };
        }
      }

      const collection = collectionId
        ? await transaction.collection.findUnique({
            where: { id: collectionId },
            select: { id: true, name: true },
          })
        : null;

      if (collectionId && !collection) {
        return { kind: "error" as const, message: "La collection selezionata non esiste più." };
      }

      const matchingMovies = await transaction.movie.findMany({
        where: {
          title: { equals: title, mode: "insensitive" },
          mediaType: mediaType as (typeof mediaTypes)[number],
        },
        select: { id: true, title: true, year: true, director: true },
        orderBy: { title: "asc" },
      });

      let movieId = existingMovieId;
      let reusedMovie = false;

      if (existingMovieId) {
        const selectedMovie = matchingMovies.find((movie) => movie.id === existingMovieId);
        if (!selectedMovie) {
          return {
            kind: "error" as const,
            message: "Il film selezionato non corrisponde al titolo e al tipo indicati.",
          };
        }
        reusedMovie = true;
      } else if (matchingMovies.length > 0) {
        return { kind: "duplicates" as const, matches: matchingMovies };
      } else {
        const movie = await transaction.movie.create({
          data: {
            title,
            mediaType: mediaType as (typeof mediaTypes)[number],
            year,
            director: director || null,
          },
          select: { id: true },
        });
        movieId = movie.id;
      }

      const physicalEdition = await transaction.physicalEdition.create({
        data: {
          movieId,
          format: format as (typeof formats)[number],
          barcode: barcode || null,
          coverUrl: savedCover?.coverUrl ?? null,
          seasonNumber:
            mediaType === "TV_SERIES" && seasonNumber ? seasonNumber : null,
          ...(collection ? { collectionId: collection.id } : {}),
        },
        select: { id: true },
      });

      return {
        kind: "success" as const,
        title,
        reusedMovie,
        editionId: physicalEdition.id,
        collectionName: collection?.name ?? null,
      };
    });

    if (result.kind === "success") {
      savedCover = null;
      revalidatePath("/");
    }
    return result;
  } catch (error) {
    return {
      kind: "error" as const,
      message: error instanceof CoverImageError
        ? error.message
        : "Salvataggio non riuscito. Controlla i dati e riprova.",
    };
  } finally {
    await removeSavedCover(savedCover?.filePath ?? null);
  }
}

export async function updateMovie(formData: FormData) {
  const movieId = String(formData.get("movieId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const mediaType = String(formData.get("mediaType") ?? "");
  const yearValue = String(formData.get("year") ?? "").trim();
  const director = String(formData.get("director") ?? "").trim();
  const editionIds = formData.getAll("editionId").map((value) => String(value));

  if (!movieId) return { kind: "error" as const, message: "Film non valido." };
  if (!title) return { kind: "error" as const, message: "Inserisci il titolo." };
  if (!mediaTypes.includes(mediaType as (typeof mediaTypes)[number])) {
    return { kind: "error" as const, message: "Seleziona un tipo di media valido." };
  }

  const year = yearValue ? Number(yearValue) : null;
  if (yearValue && (!Number.isInteger(year) || year! < 1 || year! > 9999)) {
    return { kind: "error" as const, message: "Inserisci un anno valido." };
  }

  const savedCovers: Awaited<ReturnType<typeof saveCoverInput>>[] = [];
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const movie = await transaction.movie.findUnique({
        where: { id: movieId },
        select: { id: true },
      });
      if (!movie) return { kind: "error" as const, message: "Il film non esiste più." };

      const titleConflict = await transaction.movie.findFirst({
        where: {
          id: { not: movieId },
          title: { equals: title, mode: "insensitive" },
          mediaType: mediaType as (typeof mediaTypes)[number],
        },
        select: { id: true },
      });
      if (titleConflict) {
        return {
          kind: "error" as const,
          message: "Esiste già un altro film con lo stesso titolo e tipo.",
        };
      }

      for (const editionId of editionIds) {
        const format = String(formData.get(`edition.${editionId}.format`) ?? "");
        const barcode = String(formData.get(`edition.${editionId}.barcode`) ?? "").trim();
        const seasonNumber = String(formData.get(`edition.${editionId}.seasonNumber`) ?? "").trim();
        const editionType = String(formData.get(`edition.${editionId}.editionType`) ?? "");
        const editionTitle = String(formData.get(`edition.${editionId}.editionTitle`) ?? "").trim();
        const quantityValue = String(formData.get(`edition.${editionId}.quantity`) ?? "1").trim();
        const quantity = Number(quantityValue);
        const isBoxSet = formData.get(`edition.${editionId}.isBoxSet`) === "on";

        if (!formats.includes(format as (typeof formats)[number])) {
          return { kind: "error" as const, message: "Formato edizione non valido." };
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
          return { kind: "error" as const, message: "La quantità deve essere almeno 1." };
        }
        if (![
          "STANDARD",
          "STEELBOOK",
          "COLLECTOR",
          "DIGIBOOK",
          "LIMITED",
          "OTHER",
        ].includes(editionType)) {
          return { kind: "error" as const, message: "Tipo edizione non valido." };
        }

        const edition = await transaction.physicalEdition.findFirst({
          where: { id: editionId, movieId },
          select: { id: true },
        });
        if (!edition) {
          return { kind: "error" as const, message: "Una delle edizioni non appartiene a questo film." };
        }

        if (barcode) {
          const barcodeConflict = await transaction.physicalEdition.findFirst({
            where: { barcode, id: { not: editionId } },
            select: { id: true },
          });
          if (barcodeConflict) {
            return {
              kind: "error" as const,
              message: `Il barcode ${barcode} è già assegnato a un’altra edizione.`,
            };
          }
        }

        const savedCover = await saveCoverInput(
          formData,
          `edition.${editionId}.coverUrl`,
          `edition.${editionId}.coverFile`
        );
        savedCovers.push(savedCover);

        await transaction.physicalEdition.update({
          where: { id: editionId },
          data: {
            format: format as (typeof formats)[number],
            barcode: barcode || null,
            seasonNumber: mediaType === "TV_SERIES" && seasonNumber ? seasonNumber : null,
            editionType: editionType as "STANDARD" | "STEELBOOK" | "COLLECTOR" | "DIGIBOOK" | "LIMITED" | "OTHER",
            editionTitle: editionTitle || null,
            quantity,
            isBoxSet,
            coverUrl: savedCover.coverUrl,
          },
        });
      }

      await transaction.movie.update({
        where: { id: movieId },
        data: {
          title,
          mediaType: mediaType as (typeof mediaTypes)[number],
          year,
          director: director || null,
        },
      });

      return { kind: "success" as const, title };
    });

    if (result.kind === "success") {
      savedCovers.length = 0;
      revalidatePath("/");
    }
    return result;
  } catch (error) {
    return {
      kind: "error" as const,
      message: error instanceof CoverImageError
        ? error.message
        : "Modifica non riuscita. Controlla i dati e riprova.",
    };
  } finally {
    await Promise.all(savedCovers.map((cover) => removeSavedCover(cover.filePath)));
  }
}