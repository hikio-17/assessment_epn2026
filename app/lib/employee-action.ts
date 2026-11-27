import { data } from "react-router";

import type {
  EmployeeActionData,
  EmployeeDTO,
  EmployeeFormValues,
} from "../types";
import { AppError } from "./errors";

export function employeeActionError(
  error: unknown,
  action?: EmployeeActionData["action"],
) {
  if (error instanceof AppError) {
    return data(
      {
        ok: false,
        action,
        message: error.message,
        fieldErrors: error.fieldErrors,
      } satisfies EmployeeActionData,
      { status: error.status },
    );
  }

  console.error("Employee action error:", error);

  return data(
    {
      ok: false,
      action,
      message: "Terjadi kesalahan pada server.",
      fieldErrors: {},
    } satisfies EmployeeActionData,
    { status: 500 },
  );
}

export function employeeActionSuccess(
  message: string,
  employee?: EmployeeDTO,
  values?: EmployeeFormValues,
  action?: EmployeeActionData["action"],
) {
  return data(
    {
      ok: true,
      action,
      message,
      employee,
      values,
    } satisfies EmployeeActionData,
  );
}