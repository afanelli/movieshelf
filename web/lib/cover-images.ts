import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { isIP, type LookupFunction } from "node:net";
import path from "node:path";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const MAX_COVER_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 12_000;

export class CoverImageError extends Error {}

type CoverFormat = "jpg" | "png" | "webp";

export type SavedCover = {
  coverUrl: string | null;
  filePath: string | null;
};

function detectFormat(bytes: Buffer): CoverFormat {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }

  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "png";
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  throw new CoverImageError("Usa un’immagine JPEG, PNG o WebP valida.");
}

function isPublicIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second, third] = octets;
  if (
    first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && (third === 0 || third === 2)) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  ) {
    return false;
  }

  return true;
}

async function resolvePublicIpv4(hostname: string) {
  if (isIP(hostname)) {
    throw new CoverImageError("Inserisci un URL con nome host, non un indirizzo IP.");
  }

  let addresses: Awaited<ReturnType<typeof lookup>>[];
  try {
    addresses = await lookup(hostname, { all: true, family: 4, verbatim: true });
  } catch {
    throw new CoverImageError("Non è stato possibile raggiungere il dominio dell’immagine.");
  }

  const publicAddress = addresses.find(({ address }) => isPublicIpv4(address));
  if (!publicAddress) {
    throw new CoverImageError("Il dominio dell’immagine non risolve a un indirizzo pubblico IPv4.");
  }

  return publicAddress.address;
}

async function downloadRemoteImage(inputUrl: string, redirects = 0): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    throw new CoverImageError("Inserisci un URL valido per la copertina.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "80" && url.port !== "443") ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local")
  ) {
    throw new CoverImageError("L’URL deve usare HTTP(S) e puntare a un dominio pubblico.");
  }

  const address = await resolvePublicIpv4(url.hostname);
  const pinnedLookup: LookupFunction = (_hostname, _options, callback) => {
    if (typeof _options === "object" && _options.all) {
      callback(null, [{ address, family: 4 }]);
      return;
    }
    callback(null, address, 4);
  };

  return new Promise<Buffer>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        headers: { "user-agent": "MovieShelf-Cover-Importer/1.0" },
        lookup: pinnedLookup,
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;

        if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
          response.resume();
          if (redirects >= MAX_REDIRECTS) {
            reject(new CoverImageError("L’URL della copertina ha troppi redirect."));
            return;
          }

          const nextUrl = new URL(location, url).toString();
          void downloadRemoteImage(nextUrl, redirects + 1).then(resolve, reject);
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(new CoverImageError(`Il server dell’immagine ha risposto con stato ${statusCode}.`));
          return;
        }

        const contentLength = Number(response.headers["content-length"]);
        if (Number.isFinite(contentLength) && contentLength > MAX_COVER_BYTES) {
          response.destroy();
          reject(new CoverImageError("L’immagine supera il limite di 8 MB."));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk: Buffer | Uint8Array) => {
          const buffer = Buffer.from(chunk);
          totalBytes += buffer.length;
          if (totalBytes > MAX_COVER_BYTES) {
            request.destroy(new CoverImageError("L’immagine supera il limite di 8 MB."));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      }
    );

    request.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      request.destroy(new CoverImageError("Download della copertina scaduto."));
    });
    request.on("error", reject);
    request.end();
  });
}

async function writeCover(bytes: Buffer, format: CoverFormat): Promise<SavedCover> {
  const directory = path.join(process.cwd(), "public", "covers");
  const filename = `${randomUUID()}.${format}`;
  const filePath = path.join(directory, filename);

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, bytes, { flag: "wx" });

  return { coverUrl: `/covers/${filename}`, filePath };
}

export async function saveCoverInput(
  formData: FormData,
  urlField: string,
  fileField: string
): Promise<SavedCover> {
  const urlValue = String(formData.get(urlField) ?? "").trim();
  const fileValue = formData.get(fileField);
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  if (urlValue && file) {
    throw new CoverImageError("Scegli una copertina tramite URL oppure tramite upload, non entrambe.");
  }

  if (!urlValue && !file) return { coverUrl: null, filePath: null };

  if (file) {
    if (file.size > MAX_COVER_BYTES) {
      throw new CoverImageError("L’immagine supera il limite di 8 MB.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    return writeCover(bytes, detectFormat(bytes));
  }

  if (urlValue.startsWith("/covers/")) {
    if (!/^\/covers\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(urlValue)) {
      throw new CoverImageError("Il percorso locale della copertina non è valido.");
    }
    return { coverUrl: urlValue, filePath: null };
  }

  const bytes = await downloadRemoteImage(urlValue);
  return writeCover(bytes, detectFormat(bytes));
}

export async function removeSavedCover(filePath: string | null) {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch {
    // Cleanup is best-effort; do not mask the original save error.
  }
}