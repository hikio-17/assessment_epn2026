import { useRef, useState } from "react";
import {
  Form,
  useLoaderData,
} from "react-router";
import {
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import type { Route } from "./+types/assignments";
import {
  hasRole,
  requireAuthenticatedUser,
} from "~/authorization.server";
import { LoadingBar } from "~/components/loading-bar";
import { PageHeader } from "~/components/page-header";
import { Toaster } from "~/components/toaster";
import { ApiError, useFetch } from "~/hooks/use-fetch";
import {
  ASSIGNMENT_STATUS_LABELS,
} from "~/lib/constants";
import { pushToast } from "~/lib/toast-store";
import type {
  AssignmentDTO,
  DepartmentDTO,
  EmployeeOptionDTO,
} from "~/types";

export async function loader({
  context,
}: Route.LoaderArgs) {
  const user = requireAuthenticatedUser(context);

  return {
    canWrite: hasRole(user, ["ADMIN", "HR"]),
  };
}

export function meta() {
  return [{ title: "Assignments - PeopleOps" }];
}

const statusStyles = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED:
    "border-slate-200 bg-slate-100 text-slate-500",
} as const;

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return (
      Object.values(error.fieldErrors)[0] ??
      error.message
    );
  }

  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan.";
}

export default function AssignmentsPage() {
  const { canWrite } = useLoaderData<typeof loader>();

  const departments = useFetch<DepartmentDTO[]>(
    "/api/departments",
  );
  const assignments = useFetch<AssignmentDTO[]>(
    "/api/assignments",
  );

  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [editing, setEditing] =
    useState<AssignmentDTO | null>(null);
  const [formNonce, setFormNonce] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [raceDepartmentId, setRaceDepartmentId] =
    useState("");
  const [raceEmployeeId, setRaceEmployeeId] =
    useState("");
  const [raceRunning, setRaceRunning] =
    useState(false);

  const employees = useFetch<EmployeeOptionDTO[]>(
    departmentId
      ? `/api/departments/${departmentId}/employees`
      : null,
  );
  const raceEmployees = useFetch<EmployeeOptionDTO[]>(
    raceDepartmentId
      ? `/api/departments/${raceDepartmentId}/employees`
      : null,
  );

  const submitLock = useRef(false);

  const rows = assignments.data ?? [];
  const employeeOptions = employees.data ?? [];

  const activeEmployeeIds = new Set(
    rows
      .filter((item) => item.status === "ACTIVE")
      .map((item) => item.employeeId),
  );

  const raceCandidates = (
    raceEmployees.data ?? []
  ).filter(
    (employee) =>
      !activeEmployeeIds.has(employee.id),
  );

  const raceEmployee =
    raceCandidates.find(
      (employee) =>
        String(employee.id) === raceEmployeeId,
    ) ?? null;

  const resetForm = () => {
    setEditing(null);
    setDepartmentId("");
    setEmployeeId("");
    setFormNonce((value) => value + 1);
    setFormOpen(false);
  };

  const openCreate = () => {
    setEditing(null);
    setDepartmentId("");
    setEmployeeId("");
    setFormNonce((value) => value + 1);
    setFormOpen(true);
  };

  const startEdit = (assignment: AssignmentDTO) => {
    setEditing(assignment);
    setDepartmentId(String(assignment.departmentId));
    setEmployeeId(String(assignment.employeeId));
    setFormNonce((value) => value + 1);
    setFormOpen(true);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    setEmployeeId("");
  };

  const handleRaceDepartmentChange = (value: string) => {
    setRaceDepartmentId(value);
    setRaceEmployeeId("");
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!canWrite || submitLock.current) {
      return;
    }

    if (!departmentId || !employeeId) {
      pushToast({
        id: crypto.randomUUID(),
        variant: "error",
        title: "Lengkapi form",
        description:
          "Department dan employee wajib dipilih.",
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const title = String(
      formData.get("title") ?? "",
    ).trim();
    const status = String(
      formData.get("status") ?? "ACTIVE",
    );

    if (title.length < 2) {
      pushToast({
        id: crypto.randomUUID(),
        variant: "error",
        title: "Judul tidak valid",
        description: "Judul minimal 2 karakter.",
      });
      return;
    }

    submitLock.current = true;
    const operationId = crypto.randomUUID();
    const editingId = editing?.id;

    try {
      await assignments.request({
        url: editingId
          ? `/api/assignments/${editingId}`
          : "/api/assignments",
        method: editingId ? "PUT" : "POST",
        body: {
          title,
          departmentId: Number(departmentId),
          employeeId: Number(employeeId),
          status,
          ...(editing ? { version: editing.version } : {}),
        },
      });

      pushToast({
        id: operationId,
        variant: "success",
        title: editingId
          ? "Assignment diperbarui"
          : "Assignment dibuat",
        description: title,
      });

      resetForm();
      await assignments.refetch({ silent: true });
    } catch (error) {
      pushToast({
        id: operationId,
        variant: "error",
        title: "Assignment gagal disimpan",
        description: errorText(error),
      });
    } finally {
      submitLock.current = false;
    }
  };

  const handleDelete = async (
    assignment: AssignmentDTO,
  ) => {
    if (!canWrite || assignments.submitting) {
      return;
    }

    if (
      !window.confirm(
        `Hapus assignment "${assignment.title}"?`,
      )
    ) {
      return;
    }

    const operationId = crypto.randomUUID();

    try {
      await assignments.request({
        url: `/api/assignments/${assignment.id}`,
        method: "DELETE",
      });

      if (editing?.id === assignment.id) {
        resetForm();
      }

      pushToast({
        id: operationId,
        variant: "success",
        title: "Assignment dihapus",
        description: assignment.title,
      });

      await assignments.refetch({ silent: true });
    } catch (error) {
      pushToast({
        id: operationId,
        variant: "error",
        title: "Assignment gagal dihapus",
        description: errorText(error),
      });
    }
  };

  const runRaceDemo = async () => {
    if (
      !canWrite ||
      raceRunning ||
      !raceDepartmentId ||
      !raceEmployee
    ) {
      return;
    }

    setRaceRunning(true);
    const operationId = crypto.randomUUID();

    try {
      const responses = await Promise.all(
        [1, 2, 3].map(() =>
          fetch("/api/assignments", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "Race condition demo",
              departmentId: Number(raceDepartmentId),
              employeeId: raceEmployee.id,
              status: "ACTIVE",
            }),
          }),
        ),
      );

      const statuses = responses.map(
        (response) => response.status,
      );
      const successes = statuses.filter(
        (status) => status === 201,
      ).length;
      const conflicts = statuses.filter(
        (status) => status === 409,
      ).length;

      pushToast({
        id: operationId,
        variant:
          successes === 1 && conflicts === 2
            ? "success"
            : "info",
        title: "Concurrency test selesai",
        description: `HTTP ${statuses.join(" / ")}`,
        duration: 6000,
      });

      setRaceEmployeeId("");
      await assignments.refetch({ silent: true });
    } catch (error) {
      pushToast({
        id: operationId,
        variant: "error",
        title: "Concurrency test gagal",
        description: errorText(error),
        duration: 6000,
      });
    } finally {
      setRaceRunning(false);
    }
  };

  const isLoading =
    departments.loading ||
    assignments.loading ||
    employees.loading ||
    raceEmployees.loading;

  return (
    <div className="space-y-6">
      <Toaster />

      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Assignments" },
        ]}
        title="Assignments"
        description="CRUD assignment dengan dependent dropdown, loading bar, toast, dan pengamanan concurrency di database."
        actions={
          canWrite ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              New assignment
            </button>
          ) : null
        }
      />

      <LoadingBar active={isLoading || assignments.submitting || raceRunning} />

      {!canWrite ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
          Anda hanya memiliki akses baca untuk module assignment.
        </div>
      ) : null}

      {canWrite && formOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !assignments.submitting
            ) {
              resetForm();
            }
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
        >
          <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {editing
                  ? `Edit: ${editing.title}`
                  : "Create assignment"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pilih department terlebih dahulu, lalu employee
                akan dimuat sebagai child dropdown.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {editing ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Version {editing.version}
                </span>
              ) : null}

              <button
                type="button"
                onClick={resetForm}
                disabled={assignments.submitting}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <LoadingBar active={assignments.submitting} />
          </div>

          {departments.error ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{departments.error}</span>
              <button
                type="button"
                onClick={() => departments.refetch()}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          <Form
            key={`${editing?.id ?? "new"}-${formNonce}`}
            method="post"
            onSubmit={handleSubmit}
            className="mt-5 space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="title"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Assignment name
                </label>
                <input
                  id="title"
                  name="title"
                  defaultValue={editing?.title ?? ""}
                  placeholder="Onboarding Flow Revamp"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                />
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
                  defaultValue={editing?.status ?? "ACTIVE"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
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
                  value={departmentId}
                  onChange={(event) =>
                    handleDepartmentChange(event.target.value)
                  }
                  disabled={departments.loading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white disabled:opacity-60"
                >
                  <option value="">
                    {departments.loading
                      ? "Loading departments..."
                      : "Select department"}
                  </option>
                  {(departments.data ?? []).map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.code} — {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="employeeId"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Employee
                </label>
                <select
                  id="employeeId"
                  value={employeeId}
                  onChange={(event) =>
                    setEmployeeId(event.target.value)
                  }
                  disabled={!departmentId || employees.loading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white disabled:opacity-60"
                >
                  <option value="">
                    {!departmentId
                      ? "Select department first"
                      : employees.loading
                        ? "Loading employees..."
                        : "Select employee"}
                  </option>
                  {employeeOptions.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                    >
                      {employee.name}
                      {employee.position
                        ? ` — ${employee.position}`
                        : ""}
                    </option>
                  ))}
                </select>
                {employees.error ? (
                  <p className="mt-1.5 text-xs text-rose-600">
                    {employees.error}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              {editing ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel edit
                </button>
              ) : null}

              <button
                type="submit"
                disabled={
                  assignments.submitting || raceRunning
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ClipboardList className="h-4 w-4" />
                {assignments.submitting
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create assignment"}
              </button>
            </div>
          </Form>
        </section>
          </div>
        </div>
      ) : null}

      {canWrite ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Race condition demo
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Tiga request create dikirim bersamaan. Backend
                memakai transaction, pessimistic lock, partial
                unique index, dan retry untuk menjaga konsistensi.
              </p>
            </div>

            <button
              type="button"
              onClick={runRaceDemo}
              disabled={
                raceRunning ||
                raceEmployees.loading ||
                !raceEmployee ||
                !raceDepartmentId ||
                assignments.submitting
              }
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  raceRunning ? "animate-spin" : ""
                }`}
              />
              {raceRunning
                ? "Running..."
                : "Run 3 concurrent creates"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={raceDepartmentId}
              onChange={(event) =>
                handleRaceDepartmentChange(
                  event.target.value,
                )
              }
              disabled={departments.loading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white disabled:opacity-60"
            >
              <option value="">
                Select race department
              </option>
              {(departments.data ?? []).map(
                (department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.code} — {department.name}
                  </option>
                ),
              )}
            </select>

            <select
              value={raceEmployeeId}
              onChange={(event) =>
                setRaceEmployeeId(event.target.value)
              }
              disabled={
                !raceDepartmentId ||
                raceEmployees.loading ||
                raceCandidates.length === 0
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white disabled:opacity-60"
            >
              <option value="">
                {!raceDepartmentId
                  ? "Select department first"
                  : raceEmployees.loading
                    ? "Loading employees..."
                    : raceCandidates.length === 0
                      ? "No available employee"
                      : "Select employee"}
              </option>
              {raceCandidates.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name}
                  {employee.position
                    ? ` — ${employee.position}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {raceEmployees.error ? (
            <p className="mt-2 text-xs text-rose-600">
              {raceEmployees.error}
            </p>
          ) : null}

          <p className="mt-3 text-xs text-slate-400">
            {raceEmployee
              ? `Target: ${raceEmployee.name}`
              : !raceDepartmentId
                ? "Pilih department dan employee untuk menjalankan demo."
                : raceEmployees.loading
                  ? "Memuat employee..."
                  : raceCandidates.length === 0
                    ? "Semua employee di department ini sudah punya assignment ACTIVE."
                    : "Pilih employee yang belum punya assignment ACTIVE."}
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold">
            Assignment list
          </h2>
          <p className="text-xs text-slate-500">
            {rows.length} assignment
          </p>
        </div>

        {assignments.loading && rows.length === 0 ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : assignments.error ? (
          <div className="flex items-center justify-between gap-3 p-6 text-sm text-rose-700">
            <span>{assignments.error}</span>
            <button
              type="button"
              onClick={() => assignments.refetch()}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Belum ada assignment. Buat assignment pertama untuk
            memulai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Assignment
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Department
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Employee
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Version
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {assignment.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        #{assignment.id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">
                        {assignment.department?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {assignment.department?.code ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">
                        {assignment.employee?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {assignment.employee?.position ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[assignment.status]}`}
                      >
                        {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {assignment.version}
                    </td>
                    <td className="px-6 py-4">
                      {canWrite ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(assignment)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:text-amber-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(assignment)}
                            disabled={assignments.submitting}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-slate-400">
                          Read only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
