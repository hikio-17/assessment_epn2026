import type { Route } from "./+types/api.assignment";
import {
  requireApiRole,
  requireApiUser,
} from "~/authorization.server";
import {
  apiError,
  apiSuccess,
  readJsonBody,
} from "~/lib/api-response";
import {
  AppError,
  ValidationError,
} from "~/lib/errors";
import {
  assignmentIdSchema,
  assignmentUpdateSchema,
  toFieldErrors,
} from "~/lib/validation";
import {
  requireApiAuthMiddleware,
  requireApiWriteRoleMiddleware,
} from "~/middleware/auth.server";
import {
  deleteAssignment,
  getAssignmentById,
  updateAssignment,
} from "~/services/assignment.server";

export const middleware = [
  requireApiAuthMiddleware,
  requireApiWriteRoleMiddleware(["ADMIN", "HR"]),
];

function parseId(value: string | undefined): number {
  const parsed = assignmentIdSchema.safeParse(value);

  if (!parsed.success) {
    throw new ValidationError(
      "Assignment ID tidak valid.",
    );
  }

  return parsed.data;
}

export async function loader({
  params,
  context,
}: Route.LoaderArgs) {
  try {
    requireApiUser(context);

    return apiSuccess(
      await getAssignmentById(
        parseId(params.id),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function action({
  request,
  params,
  context,
}: Route.ActionArgs) {
  try {
    requireApiRole(context, ["ADMIN", "HR"]);

    const id = parseId(params.id);

    if (request.method === "DELETE") {
      await deleteAssignment(id);

      return apiSuccess(
        null,
        "Assignment berhasil dihapus.",
      );
    }

    if (
      request.method !== "PUT" &&
      request.method !== "PATCH"
    ) {
      throw new AppError(
        "Method not allowed",
        405,
      );
    }

    const body = await readJsonBody(request);

    const parsed =
      assignmentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        "Data assignment tidak valid.",
        toFieldErrors(parsed.error),
      );
    }

    const assignment = await updateAssignment(
      id,
      parsed.data,
    );

    return apiSuccess(
      assignment,
      "Assignment berhasil diperbarui.",
    );
  } catch (error) {
    return apiError(error);
  }
}