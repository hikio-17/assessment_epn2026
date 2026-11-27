import {
  Form,
  Link,
  useNavigation,
} from "react-router";
import {
  ArrowLeft,
  Save,
  Upload,
} from "lucide-react";

import type {
  DepartmentDTO,
  EmployeeActionData,
  EmployeeFormValues,
} from "~/types";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
} from "~/lib/constants";
import { EmployeeAvatar } from "./employee-avatar";

type EmployeeFormProps = {
  mode: "create" | "edit";
  departments: DepartmentDTO[];
  values: EmployeeFormValues;
  actionData?: EmployeeActionData;
  currentPhotoUrl?: string | null;
  employeeId?: number;
  cancelTo: string;
};

function FieldError({
  message,
}: {
  message?: string;
}) {
  if (!message) return null;

  return (
    <p className="mt-1.5 text-xs text-rose-600">
      {message}
    </p>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white";

export function EmployeeForm({
  mode,
  departments,
  values,
  actionData,
  currentPhotoUrl,
  employeeId,
  cancelTo,
}: EmployeeFormProps) {
  const navigation = useNavigation();
  const submitting =
    navigation.state === "submitting";

  const fieldErrors =
    actionData?.fieldErrors ?? {};

  return (
    <div className="space-y-5">
      {actionData?.message ? (
        <div
          role={actionData.ok ? "status" : "alert"}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            actionData.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <p>{actionData.message}</p>
          {actionData.ok && actionData.employee ? (
            <Link
              to={`/employees/${actionData.employee.id}`}
              className="mt-2 inline-flex text-xs font-semibold underline underline-offset-2"
            >
              View employee
            </Link>
          ) : null}
        </div>
      ) : null}

      <Form
        method="post"
        encType="multipart/form-data"
        noValidate
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input
          type="hidden"
          name="intent"
          value={mode === "create" ? "create" : "update"}
        />
        {employeeId ? (
          <input
            type="hidden"
            name="employeeId"
            value={employeeId}
          />
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={values.name}
              aria-invalid={Boolean(fieldErrors.name)}
              className={inputClass}
              placeholder="Angga Marta"
            />
            <FieldError message={fieldErrors.name} />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={values.email}
              aria-invalid={Boolean(fieldErrors.email)}
              className={inputClass}
              placeholder="angga@peopleops.test"
            />
            <FieldError message={fieldErrors.email} />
          </div>

          <div>
            <label
              htmlFor="position"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Position
            </label>
            <input
              id="position"
              name="position"
              defaultValue={values.position}
              aria-invalid={Boolean(
                fieldErrors.position,
              )}
              className={inputClass}
              placeholder="Backend Engineer"
            />
            <FieldError message={fieldErrors.position} />
          </div>

          <div>
            <label
              htmlFor="departmentId"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Department
            </label>
            <select
              id="departmentId"
              name="departmentId"
              defaultValue={values.departmentId}
              aria-invalid={Boolean(
                fieldErrors.departmentId,
              )}
              className={inputClass}
            >
              <option value="">
                Select department
              </option>
              {departments.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.code} — {department.name}
                </option>
              ))}
            </select>
            <FieldError
              message={fieldErrors.departmentId}
            />
          </div>

          <div>
            <label
              htmlFor="salary"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Salary (IDR)
            </label>
            <input
              id="salary"
              name="salary"
              type="number"
              min="0"
              step="1"
              defaultValue={values.salary}
              aria-invalid={Boolean(fieldErrors.salary)}
              className={inputClass}
              placeholder="14000000"
            />
            <FieldError message={fieldErrors.salary} />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={values.status}
              aria-invalid={Boolean(fieldErrors.status)}
              className={inputClass}
            >
              {EMPLOYEE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {EMPLOYEE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.status} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {currentPhotoUrl ? (
              <EmployeeAvatar
                name={values.name || "Employee"}
                photoUrl={currentPhotoUrl}
                className="h-16 w-16 shrink-0 rounded-2xl text-lg"
              />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-200 text-slate-500">
                <Upload className="h-6 w-6" />
              </span>
            )}

            <div className="flex-1">
              <label
                htmlFor="photo"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Photo
              </label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                JPG, JPEG, PNG, atau WebP. Maksimal 2MB.
              </p>
              <FieldError message={fieldErrors.photo} />
            </div>
          </div>

          {mode === "edit" && currentPhotoUrl ? (
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                name="removePhoto"
                className="h-4 w-4 rounded border-slate-300 text-rose-600"
              />
              Hapus foto saat ini
            </label>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <Link
            to={cancelTo}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitting
              ? "Saving..."
              : mode === "create"
                ? "Create employee"
                : "Save changes"}
          </button>
        </div>
      </Form>
    </div>
  );
}