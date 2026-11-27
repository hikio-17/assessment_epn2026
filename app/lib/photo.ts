export const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

export const PHOTO_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoValidationResult =
  | { ok: true; extension: string }
  | { ok: false; message: string };

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0
    ? filename.slice(dot).toLowerCase()
    : "";
}

export function validatePhoto(
  file: File,
): PhotoValidationResult {
  if (file.size <= 0) {
    return {
      ok: false,
      message: "File foto kosong.",
    };
  }

  if (file.size > MAX_PHOTO_SIZE) {
    return {
      ok: false,
      message: "Ukuran foto maksimal 2MB.",
    };
  }

  const extension = extensionOf(file.name);

  if (
    !(PHOTO_EXTENSIONS as readonly string[]).includes(
      extension,
    )
  ) {
    return {
      ok: false,
      message:
        "Ekstensi foto harus jpg, jpeg, png, atau webp.",
    };
  }

  if (
    !(PHOTO_MIME_TYPES as readonly string[]).includes(
      file.type,
    )
  ) {
    return {
      ok: false,
      message: "Tipe file foto tidak didukung.",
    };
  }

  return {
    ok: true,
    extension,
  };
}

export function isSafePhotoFilename(
  filename: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpe?g|png|webp)$/i.test(
    filename,
  );
}

export function contentTypeForPhoto(
  filename: string,
): string {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";

  return "image/jpeg";
}