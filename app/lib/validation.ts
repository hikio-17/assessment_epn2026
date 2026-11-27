import { z, type ZodError } from "zod";

import { EMPLOYEE_STATUSES, ASSIGNMENT_STATUSES } from "./constants";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  redirectTo: z.string().optional().default("/"),
});

export const employeeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(120, "Nama maksimal 120 karakter."),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid."),

  position: z
    .string()
    .trim()
    .min(2, "Posisi minimal 2 karakter.")
    .max(120, "Posisi maksimal 120 karakter."),

  departmentId: z
    .string()
    .trim()
    .min(1, "Department wajib dipilih.")
    .transform((value) => Number(value))
    .pipe(
      z
        .number()
        .int("Department tidak valid.")
        .positive("Department wajib dipilih."),
    ),

  salary: z
    .string()
    .trim()
    .min(1, "Salary wajib diisi.")
    .transform((value) => Number(value))
    .pipe(
      z
        .number()
        .int("Salary harus berupa bilangan bulat.")
        .min(0, "Salary tidak boleh negatif.")
        .max(2_000_000_000, "Salary terlalu besar."),
    ),

  status: z.enum([...EMPLOYEE_STATUSES]),
});

export type EmployeeInput = z.infer<
  typeof employeeInputSchema
>;

export const employeeDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(120, "Nama maksimal 120 karakter."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid."),
  position: z
    .string()
    .trim()
    .min(2, "Posisi minimal 2 karakter.")
    .max(120, "Posisi maksimal 120 karakter."),
  note: z
    .string()
    .trim()
    .max(300, "Catatan maksimal 300 karakter.")
    .optional()
    .default(""),
});

export type EmployeeDraftInput = z.infer<
  typeof employeeDraftSchema
>;

export const employeeIdSchema = z.coerce
  .number()
  .int()
  .positive();

export const assignmentCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Judul minimal 2 karakter.")
    .max(160, "Judul maksimal 160 karakter."),

  departmentId: z.coerce
    .number()
    .int()
    .positive("Department wajib dipilih."),

  employeeId: z.coerce
    .number()
    .int()
    .positive("Employee wajib dipilih."),

  status: z
    .enum([...ASSIGNMENT_STATUSES])
    .default("ACTIVE"),
});

export type AssignmentCreateInput = z.infer<
  typeof assignmentCreateSchema
>;

export const assignmentUpdateSchema =
  assignmentCreateSchema.extend({
    version: z.coerce
      .number()
      .int()
      .positive("Version tidak valid."),
  });

export type AssignmentUpdateInput = z.infer<
  typeof assignmentUpdateSchema
>;

export const assignmentIdSchema = z.coerce
  .number()
  .int()
  .positive();

export const departmentIdSchema = z.coerce
  .number()
  .int()
  .positive();

export function toFieldErrors(
  error: ZodError,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.length
      ? issue.path.join(".")
      : "form";

    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}