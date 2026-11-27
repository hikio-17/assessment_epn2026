import { useRef, useState } from "react";
import {
  Form,
  useLoaderData,
} from "react-router";
import {
  ClipboardList,
  Loader2,
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
import { ConfirmDialog } from "~/components/confirm-dialog";
import { LoadingBar } from "~/components/loading-bar";
import { PageHeader } from "~/components/page-header";
import { Toaster } from "~/components/toaster";
import { ApiError, useFetch } from "~/hooks/use-fetch";
import {
  ASSIGNMENT_STATUS_LABELS,
} from "~/lib/constants";
import { usePageLoading } from "~/lib/page-loading";
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
  return [{ title: "Penugasan - PeopleOps" }];
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
  const [pendingDelete, setPendingDelete] =
    useState<AssignmentDTO | null>(null);
  const [deletingId, setDeletingId] = useState<
    number | null
  >(null);

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

  usePageLoading(
    assignments.loading ||
      assignments.submitting ||
      raceRunning,
  );

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
          "Departemen dan karyawan wajib dipilih.",
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
          ? "Penugasan diperbarui"
          : "Penugasan dibuat",
        description: title,
      });

      resetForm();
      await assignments.refetch({ silent: true });
    } catch (error) {
      pushToast({
        id: operationId,
        variant: "error",
        title: "Penugasan gagal disimpan",
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

    const operationId = crypto.randomUUID();
    setDeletingId(assignment.id);

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
        title: "Penugasan dihapus",
        description: assignment.title,
      });

      await assignments.refetch({ silent: true });
    } catch (error) {
      pushToast({
        id: operationId,
        variant: "error",
        title: "Penugasan gagal dihapus",
        description: errorText(error),
      });
    } finally {
      setDeletingId(null);
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
        title: "Uji konkurensi selesai",
        description: `HTTP ${statuses.join(" / ")}`,
        duration: 6000,
      });

      setRaceEmployeeId("");
      await assignments.refetch({ silent: true });
    } catch (error) {
      pushToast({
        id: operationId,
        variant: "error",
        title: "Uji konkurensi gagal",
        description: errorText(error),
        duration: 6000,
      });
    } finally {
      setRaceRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster />

      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Penugasan" },
        ]}
        title="Penugasan"
        description="Kelola pekerjaan aktif karyawan dan status penyelesaiannya."
        actions={
          canWrite ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Tambah penugasan
            </button>
          ) : null
        }
      />

      {!canWrite ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
          Anda hanya memiliki akses baca untuk modul penugasan.
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
                  ? `Ubah: ${editing.title}`
                  : "Tambah penugasan"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pilih departemen terlebih dahulu, lalu pilih
                karyawan yang akan ditugaskan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {editing ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
  Versi {editing.version}
                </span>
              ) : null}

              <button
                type="button"
                onClick={resetForm}
                disabled={assignments.submitting}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Tutup form"
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
                Coba lagi
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
                  Nama penugasan
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
                  <option value="ACTIVE">Aktif</option>
                  <option value="COMPLETED">Selesai</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="departmentId"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Departemen
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
                      ? "Memuat departemen..."
                      : "Pilih departemen"}
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
                  Karyawan
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
                      ? "Pilih departemen dulu"
                      : employees.loading
                        ? "Memuat karyawan..."
                        : "Pilih karyawan"}
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
                  disabled={assignments.submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
              ) : null}

              <button
                type="submit"
                disabled={
                  assignments.submitting || raceRunning
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignments.submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4" />
                )}
                {assignments.submitting
                  ? "Menyimpan..."
                  : editing
                    ? "Simpan perubahan"
                    : "Tambah penugasan"}
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
                Uji konkurensi
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Kirim tiga permintaan penugasan sekaligus untuk
                memastikan hanya satu yang tersimpan.
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
                ? "Menjalankan..."
                : "Jalankan 3 permintaan"}
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
                Pilih departemen
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
                  ? "Pilih departemen dulu"
                  : raceEmployees.loading
                    ? "Memuat karyawan..."
                    : raceCandidates.length === 0
                      ? "Tidak ada karyawan tersedia"
                      : "Pilih karyawan"}
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
                ? "Pilih departemen dan karyawan untuk menjalankan demo."
                : raceEmployees.loading
                  ? "Memuat karyawan..."
                  : raceCandidates.length === 0
                    ? "Semua karyawan di departemen ini sudah punya penugasan aktif."
                    : "Pilih karyawan yang belum punya penugasan aktif."}
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold">
            Daftar penugasan
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
              Coba lagi
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
                    Penugasan
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Departemen
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Karyawan
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Versi
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
                            disabled={assignments.submitting}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:text-amber-700 disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Ubah
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setPendingDelete(assignment)
                            }
                            disabled={assignments.submitting}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingId === assignment.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            {deletingId === assignment.id
                              ? "Menghapus..."
                              : "Hapus"}
                          </button>
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-slate-400">
                          Hanya lihat
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus penugasan?"
        description={
          pendingDelete
            ? `Penugasan "${pendingDelete.title}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel="Hapus penugasan"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;

          const assignment = pendingDelete;
          setPendingDelete(null);
          void handleDelete(assignment);
        }}
      />
    </div>
  );
}
