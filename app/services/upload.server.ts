import "dotenv/config";

import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { AppError, ValidationError } from "../lib/errors";
import {
  contentTypeForPhoto,
  isSafePhotoFilename,
  validatePhoto,
} from "../lib/photo";

export type StoredPhoto = {
  filename: string;
  size: number;
  url: string;
};

export function getUploadDir(): string {
  return path.resolve(
    process.env.UPLOAD_DIR ?? "uploads",
  );
}

async function ensureUploadDir(): Promise<void> {
  await mkdir(getUploadDir(), { recursive: true });
}

export async function saveEmployeePhoto(
  file: File,
): Promise<StoredPhoto> {
  const validation = validatePhoto(file);

  if (!validation.ok) {
    throw new ValidationError("Foto tidak valid.", {
      photo: validation.message,
    });
  }

  const filename = `${randomUUID()}${validation.extension}`;
  const filePath = path.join(getUploadDir(), filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await ensureUploadDir();

  try {
    await writeFile(filePath, buffer);
  } catch {
    await unlink(filePath).catch(() => undefined);

    throw new AppError(
      "Gagal menyimpan file foto.",
      500,
    );
  }

  return {
    filename,
    size: buffer.length,
    url: `/uploads/${filename}`,
  };
}

export async function deleteStoredPhoto(
  filename: string | null | undefined,
): Promise<void> {
  if (!filename) return;
  if (path.basename(filename) !== filename) return;
  if (!isSafePhotoFilename(filename)) return;

  try {
    await unlink(path.join(getUploadDir(), filename));
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

export async function deleteStoredPhotoSafely(
  filename: string | null | undefined,
): Promise<void> {
  try {
    await deleteStoredPhoto(filename);
  } catch (error) {
    console.error(
      "Gagal menghapus file foto:",
      filename,
      error,
    );
  }
}

export async function readStoredPhoto(
  filename: string,
): Promise<{
  buffer: Buffer;
  contentType: string;
} | null> {
  if (!isSafePhotoFilename(filename)) {
    return null;
  }

  try {
    const buffer = await readFile(
      path.join(getUploadDir(), filename),
    );

    return {
      buffer,
      contentType: contentTypeForPhoto(filename),
    };
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}