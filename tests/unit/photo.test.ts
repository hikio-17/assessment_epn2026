import { describe, expect, it } from "vitest";

import {
  MAX_PHOTO_SIZE,
  contentTypeForPhoto,
  isSafePhotoFilename,
  validatePhoto,
} from "~/lib/photo";

function file(
  bytes: number,
  name: string,
  type: string,
) {
  return new File(
    [new Uint8Array(bytes)],
    name,
    { type },
  );
}

describe("photo validation", () => {
  it("accepts supported images", () => {
    const result = validatePhoto(
      file(10, "photo.PNG", "image/png"),
    );

    expect(result).toEqual({
      ok: true,
      extension: ".png",
    });
  });

  it("rejects empty file", () => {
    const result = validatePhoto(
      file(0, "photo.png", "image/png"),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects file over 2MB", () => {
    const result = validatePhoto(
      file(
        MAX_PHOTO_SIZE + 1,
        "photo.jpg",
        "image/jpeg",
      ),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects invalid extension", () => {
    const result = validatePhoto(
      file(10, "photo.txt", "text/plain"),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects invalid MIME type", () => {
    const result = validatePhoto(
      file(10, "photo.png", "text/plain"),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects path traversal filenames", () => {
    expect(
      isSafePhotoFilename("../secret.png"),
    ).toBe(false);
    expect(
      isSafePhotoFilename(
        "00000000-0000-4000-8000-000000000000.png",
      ),
    ).toBe(true);
  });

  it("returns image content types", () => {
    expect(contentTypeForPhoto("a.png")).toBe(
      "image/png",
    );
    expect(contentTypeForPhoto("a.webp")).toBe(
      "image/webp",
    );
    expect(contentTypeForPhoto("a.jpg")).toBe(
      "image/jpeg",
    );
  });
});
