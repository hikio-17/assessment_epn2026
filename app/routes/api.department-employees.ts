import type { Route } from "./+types/api.department-employees";
import { requireApiUser } from "~/authorization.server";
import {
  apiError,
  apiSuccess,
} from "~/lib/api-response";
import { ValidationError } from "~/lib/errors";
import { departmentIdSchema } from "~/lib/validation";
import { requireApiAuthMiddleware } from "~/middleware/auth.server";
import { listEmployeesByDepartment } from "~/services/department.server";

export const middleware = [
  requireApiAuthMiddleware,
];

export async function loader({
  params,
  context,
}: Route.LoaderArgs) {
  try {
    requireApiUser(context);

    const parsed = departmentIdSchema.safeParse(
      params.departmentId,
    );

    if (!parsed.success) {
      throw new ValidationError(
        "Department ID tidak valid.",
      );
    }

    return apiSuccess(
      await listEmployeesByDepartment(parsed.data),
    );
  } catch (error) {
    return apiError(error);
  }
}