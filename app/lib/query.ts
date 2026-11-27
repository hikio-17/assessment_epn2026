import { z } from "zod";

import { employeeIdSchema } from "./validation";

const employeeListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  departmentId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional(),
});

export type EmployeeListQuery = {
  search?: string;
  departmentId?: number;
  page: number;
};

export function parseEmployeeListQuery(
  searchParams: URLSearchParams,
): EmployeeListQuery {
  const parsed = employeeListQuerySchema.safeParse({
    q: searchParams.get("q")?.trim() || undefined,
    departmentId:
      searchParams.get("department") || undefined,
    page: searchParams.get("page") || undefined,
  });

  if (!parsed.success) {
    return { page: 1 };
  }

  return {
    search: parsed.data.q,
    departmentId: parsed.data.departmentId,
    page: parsed.data.page ?? 1,
  };
}

export function parseEmployeeId(
  value: string | undefined,
): number | null {
  const parsed = employeeIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}