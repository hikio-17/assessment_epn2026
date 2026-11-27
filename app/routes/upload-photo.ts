import type { Route } from "./+types/upload-photo";
import { requireApiAuthMiddleware } from "~/middleware/auth.server";
import { readStoredPhoto } from "~/services/upload.server";

export const middleware = [
  requireApiAuthMiddleware,
];

export async function loader({
  params,
}: Route.LoaderArgs) {
  const filename = params.filename;

  if (!filename) {
    throw new Response("Not found", { status: 404 });
  }

  const photo = await readStoredPhoto(filename);

  if (!photo) {
    throw new Response("Not found", { status: 404 });
  }

  return new Response(
    new Uint8Array(photo.buffer),
    {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    },
  );
}