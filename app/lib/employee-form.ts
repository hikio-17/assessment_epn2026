import type { EmployeeFormValues } from "../types";
import { validatePhoto } from "./photo";
import {
  employeeInputSchema,
  toFieldErrors,
  type EmployeeInput,
} from "./validation";

export type ParsedEmployeeForm = {
  values: EmployeeFormValues;
  input: EmployeeInput | null;
  fieldErrors: Record<string, string>;
  photo: File | null;
  removePhoto: boolean;
};

export function parseEmployeeForm(
  formData: FormData,
): ParsedEmployeeForm {
  const values: EmployeeFormValues = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    position: String(
      formData.get("position") ?? "",
    ),
    departmentId: String(
      formData.get("departmentId") ?? "",
    ),
    salary: String(formData.get("salary") ?? ""),
    status: String(
      formData.get("status") ?? "ACTIVE",
    ),
  };

  const parsed = employeeInputSchema.safeParse(values);

  const fieldErrors: Record<string, string> =
    parsed.success
      ? {}
      : toFieldErrors(parsed.error);

  const photoValue = formData.get("photo");

  const photo =
    photoValue instanceof File && photoValue.size > 0
      ? photoValue
      : null;

  if (photo) {
    const photoValidation = validatePhoto(photo);

    if (!photoValidation.ok) {
      fieldErrors.photo = photoValidation.message;
    }
  }

  return {
    values,
    input: parsed.success ? parsed.data : null,
    fieldErrors,
    photo,
    removePhoto:
      formData.get("removePhoto") === "on",
  };
}