import { z, type ZodError } from "zod";

import {
  ASSIGNMENT_STATUSES,
  EMPLOYEE_STATUSES,
  USER_ROLES,
} from "./constants";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  redirectTo: z.string().optional().default("/"),
});

export const userCreateSchema = z.object({
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
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter.")
    .max(72, "Kata sandi maksimal 72 karakter."),
  role: z.enum([...USER_ROLES]),
});

export type UserCreateInput = z.infer<
  typeof userCreateSchema
>;

export const userCreateFormSchema = userCreateSchema
  .extend({
    confirmPassword: z
      .string()
      .min(1, "Konfirmasi kata sandi wajib diisi."),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Konfirmasi kata sandi tidak sama.",
    },
  );

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
    .min(1, "Departemen wajib dipilih.")
    .transform((value) => Number(value))
    .pipe(
      z
        .number()
        .int("Departemen tidak valid.")
        .positive("Departemen wajib dipilih."),
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
    .positive("Departemen wajib dipilih."),

  employeeId: z.coerce
    .number()
    .int()
    .positive("Karyawan wajib dipilih."),

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