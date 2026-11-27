import type { Route } from "./+types/api.assignments";
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
  assignmentCreateSchema,
  toFieldErrors,
} from "~/lib/validation";
import {
  requireApiAuthMiddleware,
  requireApiWriteRoleMiddleware,
} from "~/middleware/auth.server";
import {
  createAssignment,
  listAssignments,
} from "~/services/assignment.server";

export const middleware = [
  requireApiAuthMiddleware,
  requireApiWriteRoleMiddleware(["ADMIN", "HR"]),
];

export async function loader({
  context,
}: Route.LoaderArgs) {
  try {
    requireApiUser(context);

    return apiSuccess(
      await listAssignments(),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function action({
  request,
  context,
}: Route.ActionArgs) {
  try {
    requireApiRole(context, ["ADMIN", "HR"]);

    if (request.method !== "POST") {
      throw new AppError(
        "Method not allowed",
        405,
      );
    }

    const body = await readJsonBody(request);

    const parsed =
      assignmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        "Data assignment tidak valid.",
        toFieldErrors(parsed.error),
      );
    }

    const assignment = await createAssignment(
      parsed.data,
    );

    return apiSuccess(
      assignment,
      "Penugasan berhasil dibuat.",
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}