import { useState } from "react";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "react-router";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type { Route } from "./+types/employees-list";
import {
  hasRole,
  requireAuthenticatedUser,
} from "~/authorization.server";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { EmployeeAvatar } from "~/components/employee-avatar";
import { EmployeeForm } from "~/components/employee-form";
import { PageHeader } from "~/components/page-header";
import { EMPLOYEE_STATUS_LABELS } from "~/lib/constants";
import {
  employeeActionError,
  employeeActionSuccess,
} from "~/lib/employee-action";
import { parseEmployeeForm } from "~/lib/employee-form";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "~/lib/errors";
import { formatRupiah } from "~/lib/format";
import {
  parseEmployeeId,
  parseEmployeeListQuery,
  type EmployeeListQuery,
} from "~/lib/query";
import { listDepartments } from "~/services/department.server";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  listEmployees,
  updateEmployee,
} from "~/services/employee.server";
import type {
  EmployeeActionData,
  EmployeeDTO,
  EmployeeFormValues,
} from "~/types";

export async function loader({
  request,
  context,
}: Route.LoaderArgs) {
  const user = requireAuthenticatedUser(context);

  const url = new URL(request.url);
  const filters = parseEmployeeListQuery(
    url.searchParams,
  );
  const editingId =
    url.searchParams.get("form") === "edit"
      ? parseEmployeeId(
          url.searchParams.get("id") ?? undefined,
        )
      : null;

  const [result, departments, editingEmployee] =
    await Promise.all([
      listEmployees({
        search: filters.search,
        departmentId: filters.departmentId,
        page: filters.page,
        perPage: 8,
      }),
      listDepartments(),
      editingId
        ? getEmployeeById(editingId).catch((error) => {
            if (error instanceof NotFoundError) {
              return null;
            }

            throw error;
          })
        : Promise.resolve(null),
    ]);

  return {
    ...result,
    departments,
    filters,
    editingEmployee,
    canManage: hasRole(user, ["ADMIN", "HR"]),
  };
}

export async function action({
  request,
  context,
}: Route.ActionArgs) {
  const user = requireAuthenticatedUser(context);

  if (!hasRole(user, ["ADMIN", "HR"])) {
    return employeeActionError(
      new ForbiddenError(
        "Anda tidak memiliki akses untuk mengubah employee.",
      ),
    );
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create" || intent === "update") {
    const parsed = parseEmployeeForm(formData);

    if (
      !parsed.input ||
      Object.keys(parsed.fieldErrors).length > 0
    ) {
      return employeeActionError(
        new ValidationError(
          "Periksa kembali form.",
          parsed.fieldErrors,
        ),
        intent,
      );
    }

    try {
      if (intent === "update") {
        const employeeId = parseEmployeeId(
          String(formData.get("employeeId") ?? ""),
        );

        if (!employeeId) {
          return employeeActionError(
            new ValidationError(
              "ID karyawan tidak valid.",
            ),
            "update",
          );
        }

        const employee = await updateEmployee(
          employeeId,
          parsed.input,
          parsed.photo,
          parsed.removePhoto,
        );

        return employeeActionSuccess(
          "Karyawan berhasil diperbarui.",
          employee,
          parsed.values,
          "update",
        );
      }

      const employee = await createEmployee(
        parsed.input,
        parsed.photo,
      );

      return employeeActionSuccess(
        "Karyawan berhasil dibuat.",
        employee,
        parsed.values,
        "create",
      );
    } catch (error) {
      return employeeActionError(error, intent);
    }
  }

  if (intent !== "delete") {
    return employeeActionError(
      new ValidationError("Action tidak dikenal."),
    );
  }

  const employeeId = parseEmployeeId(
    String(formData.get("employeeId") ?? ""),
  );

  if (!employeeId) {
    return employeeActionError(
      new ValidationError("ID karyawan tidak valid."),
      "delete",
    );
  }

  try {
    await deleteEmployee(employeeId);

    return employeeActionSuccess(
      "Karyawan berhasil dihapus.",
      undefined,
      undefined,
      "delete",
    );
  } catch (error) {
    return employeeActionError(error, "delete");
  }
}

export function meta() {
  return [{ title: "Karyawan - PeopleOps" }];
}

function buildPageLink(
  page: number,
  filters: EmployeeListQuery,
): string {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("q", filters.search);
  }

  if (filters.departmentId) {
    params.set(
      "department",
      String(filters.departmentId),
    );
  }

  params.set("page", String(page));

  return `/employees?${params.toString()}`;
}

const statusStyles = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  INACTIVE:
    "border-slate-200 bg-slate-100 text-slate-500",
} as const;

function toFormValues(
  employee: EmployeeDTO,
): EmployeeFormValues {
  return {
    name: employee.name,
    email: employee.email,
    position: employee.position,
    departmentId: String(employee.departmentId),
    salary: String(employee.salary),
    status: employee.status,
  };
}

const emptyEmployeeValues: EmployeeFormValues = {
  name: "",
  email: "",
  position: "",
  departmentId: "",
  salary: "",
  status: "ACTIVE",
};

export default function EmployeesListPage() {
  const {
    employees,
    total,
    page,
    perPage,
    totalPages,
    departments,
    filters,
    editingEmployee,
    canManage,
  } = useLoaderData<typeof loader>();

  const actionData = useActionData<EmployeeActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const submitting = navigation.state === "submitting";
  const [searchParams, setSearchParams] =
    useSearchParams();
  const [pendingDelete, setPendingDelete] =
    useState<EmployeeDTO | null>(null);

  const deletingEmployeeId =
    submitting &&
    navigation.formData?.get("intent") === "delete"
      ? Number(navigation.formData.get("employeeId"))
      : null;

  const modalType = searchParams.get("form");
  const modalOpen =
    modalType === "create" ||
    (modalType === "edit" && editingEmployee !== null);

  const listActionData =
    actionData?.action === "delete"
      ? actionData
      : undefined;
  const modalActionData =
    actionData?.action === "create" ||
    actionData?.action === "update"
      ? actionData
      : undefined;

  const start =
    total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const hasFilter = Boolean(
    filters.search || filters.departmentId,
  );

  const closeParams = new URLSearchParams(searchParams);
  closeParams.delete("form");
  closeParams.delete("id");
  const cancelTo = closeParams.toString()
    ? `/employees?${closeParams.toString()}`
    : "/employees";

  const openCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.set("form", "create");
    next.delete("id");
    setSearchParams(next);
  };

  const openEdit = (employee: EmployeeDTO) => {
    const next = new URLSearchParams(searchParams);
    next.set("form", "edit");
    next.set("id", String(employee.id));
    setSearchParams(next);
  };

  const closeModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("form");
    next.delete("id");
    setSearchParams(next);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Karyawan" },
        ]}
        title="Karyawan"
        description="Data karyawan, departemen, dan status kepegawaian."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah karyawan
            </button>
          ) : (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
              Hanya lihat
            </span>
          )
        }
      />

      <Form
        key={`${filters.search ?? ""}-${filters.departmentId ?? ""}`}
        method="get"
        action="/employees"
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={filters.search ?? ""}
            placeholder="Cari nama, email, atau posisi..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
          />
        </div>

        <select
          name="department"
          defaultValue={
            filters.departmentId
              ? String(filters.departmentId)
              : ""
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white md:w-64"
        >
          <option value="">Semua departemen</option>
          {departments.map((department) => (
            <option
              key={department.id}
              value={department.id}
            >
              {department.code} — {department.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Terapkan
        </button>

        {hasFilter ? (
          <Link
            to="/employees"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Atur ulang
          </Link>
        ) : null}
      </Form>

      {listActionData?.message ? (
        <div
          role={listActionData.ok ? "status" : "alert"}
          className={`rounded-2xl border px-4 py-3 text-sm ${listActionData.ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
        >
          {listActionData.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">
              Daftar karyawan
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Menampilkan {start}–{end} dari {total}
            </p>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-semibold text-slate-700">
              Data tidak ditemukan
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Coba ubah kata kunci atau filter departemen.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Karyawan
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Departemen
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Posisi
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Gaji
                  </th>
                  <th className="px-6 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          name={employee.name}
                          photoUrl={employee.photoUrl}
                          className="h-10 w-10 rounded-xl text-xs"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {employee.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">
                        {employee.department?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {employee.department?.code ?? ""}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {employee.position}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatRupiah(employee.salary)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[employee.status]}`}
                      >
                        {
                          EMPLOYEE_STATUS_LABELS[
                          employee.status
                          ]
                        }
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/employees/${employee.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Lihat
                        </Link>

                        {canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(employee)}
                              disabled={submitting}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:text-amber-700 disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Ubah
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setPendingDelete(employee)
                              }
                              disabled={submitting}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deletingEmployeeId ===
                              employee.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              {deletingEmployeeId === employee.id
                                ? "Menghapus..."
                                : "Hapus"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          {page > 1 ? (
            <Link
              to={buildPageLink(page - 1, filters)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Sebelumnya
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-slate-300">
              Sebelumnya
            </span>
          )}

          <span className="text-xs font-medium text-slate-500">
            Halaman {page} dari {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              to={buildPageLink(page + 1, filters)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Berikutnya
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-slate-300">
              Berikutnya
            </span>
          )}
        </div>
      ) : null}

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="employee-modal-title"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting
            ) {
              closeModal();
            }
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
        >
          <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="employee-modal-title"
                  className="text-xl font-semibold"
                >
                  {editingEmployee
                    ? "Ubah karyawan"
                    : "Tambah karyawan"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingEmployee
                    ? "Perbarui data karyawan yang sudah ada."
                    : "Lengkapi data karyawan baru."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Tutup form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <EmployeeForm
              key={editingEmployee?.updatedAt ?? "create"}
              mode={editingEmployee ? "edit" : "create"}
              departments={departments}
              values={
                modalActionData?.values ??
                (editingEmployee
                  ? toFormValues(editingEmployee)
                  : emptyEmployeeValues)
              }
              actionData={modalActionData}
              currentPhotoUrl={
                editingEmployee?.photoUrl ?? null
              }
              employeeId={editingEmployee?.id}
              cancelTo={cancelTo}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus karyawan?"
        description={
          pendingDelete
            ? `Data ${pendingDelete.name} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel="Hapus karyawan"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;

          const employeeId = pendingDelete.id;
          setPendingDelete(null);
          submit(
            {
              intent: "delete",
              employeeId: String(employeeId),
            },
            { method: "post" },
          );
        }}
      />
    </div>
  );
}