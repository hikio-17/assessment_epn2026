import type { Route } from "./+types/api.departments";
import { requireApiUser } from "~/authorization.server";
import {
  apiError,
  apiSuccess,
} from "~/lib/api-response";
import { requireApiAuthMiddleware } from "~/middleware/auth.server";
import { listDepartments } from "~/services/department.server";

export const middleware = [
  requireApiAuthMiddleware,
];

export async function loader({
  context,
}: Route.LoaderArgs) {
  try {
    requireApiUser(context);

    return apiSuccess(
      await listDepartments(),
    );
  } catch (error) {
    return apiError(error);
  }
}