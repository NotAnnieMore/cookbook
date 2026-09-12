export const MAX_IMPORT_IMAGE_COUNT = 4;
export const MAX_IMPORT_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMPORT_IMAGES_TOTAL_BYTES = 8 * 1024 * 1024;

export type ImportImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: Uint8Array;
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectImportImageMime(bytes: Uint8Array): ImportImage["mimeType"] | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

export async function prepareImportImages(values: FormDataEntryValue[]): Promise<{
  images: ImportImage[];
  error: string | null;
}> {
  const files = values.filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return { images: [], error: null };
  if (files.length > MAX_IMPORT_IMAGE_COUNT) {
    return { images: [], error: `Escolhe no máximo ${MAX_IMPORT_IMAGE_COUNT} capturas de ecrã.` };
  }
  if (files.some((file) => file.size > MAX_IMPORT_IMAGE_BYTES)) {
    return { images: [], error: "Cada captura pode ter no máximo 4 MB." };
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_IMPORT_IMAGES_TOTAL_BYTES) {
    return { images: [], error: "As capturas podem ocupar no máximo 8 MB no total." };
  }

  const images: ImportImage[] = [];
  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectImportImageMime(data);
    if (!mimeType) {
      return { images: [], error: "Usa capturas em JPEG, PNG ou WebP." };
    }
    images.push({ mimeType, data });
  }
  return { images, error: null };
}
