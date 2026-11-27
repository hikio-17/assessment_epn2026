import { useState } from "react";
import {
  Form,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import type { Route } from "./+types/admin-users";
import { PageHeader } from "~/components/page-header";
import { requirePageRole } from "~/authorization.server";
import {
  ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from "~/lib/constants";
import { AppError } from "~/lib/errors";
import {
  toFieldErrors,
  userCreateFormSchema,
} from "~/lib/validation";
import { requireRoleMiddleware } from "~/middleware/auth.server";
import {
  createUser,
  listUsers,
} from "~/services/user.server";
import type {
  UserActionData,
  UserFormValues,
} from "~/types";

export const middleware = [
  requireRoleMiddleware(["ADMIN"]),
];

export async function loader({
  request,
  context,
}: Route.LoaderArgs) {
  requirePageRole(context, ["ADMIN"]);

  const url = new URL(request.url);

  return {
    users: await listUsers(),
    created: url.searchParams.get("created") === "1",
  };
}

export async function action({
  request,
  context,
}: Route.ActionArgs) {
  requirePageRole(context, ["ADMIN"]);

  const formData = await request.formData();

  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(
      formData.get("confirmPassword") ?? "",
    ),
    role: String(formData.get("role") ?? "VIEWER"),
  };

  const values: UserFormValues = {
    name: raw.name,
    email: raw.email,
    role: raw.role,
  };

  const parsed = userCreateFormSchema.safeParse(raw);

  if (!parsed.success) {
    return data(
      {
        ok: false,
        message: "Periksa kembali form.",
        fieldErrors: toFieldErrors(parsed.error),
        values,
      } satisfies UserActionData,
      { status: 400 },
    );
  }

  try {
    await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role,
    });

    return redirect("/admin/users?created=1");
  } catch (error) {
    if (error instanceof AppError) {
      return data(
        {
          ok: false,
          message: error.message,
          fieldErrors: error.fieldErrors,
          values,
        } satisfies UserActionData,
        { status: error.status },
      );
    }

    console.error("User action error:", error);

    return data(
      {
        ok: false,
        message: "Terjadi kesalahan pada server.",
        fieldErrors: {},
        values,
      } satisfies UserActionData,
      { status: 500 },
    );
  }
}

export function meta() {
  return [{ title: "Pengguna - PeopleOps" }];
}

const roleStyles: Record<UserRole, string> = {
  ADMIN: "border-violet-200 bg-violet-50 text-violet-700",
  HR: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VIEWER: "border-slate-200 bg-slate-50 text-slate-600",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white";

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

export default function AdminUsersPage() {
  const { users, created } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<UserActionData>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [searchParams, setSearchParams] =
    useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const formOpen = searchParams.get("form") === "create";
  const adminCount = users.filter(
    (user) => user.role === "ADMIN",
  ).length;
  const fieldErrors = actionData?.fieldErrors ?? {};
  const selectedRole =
    USER_ROLES.find(
      (role) => role === actionData?.values?.role,
    ) ?? "VIEWER";

  const openCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("created");
    next.set("form", "create");
    setSearchParams(next);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const closeForm = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("form");
    setSearchParams(next);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const dismissCreated = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("created");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Admin" },
          { label: "Pengguna" },
        ]}
        title="Pengguna"
        description="Daftar akun dan hak akses pengguna PeopleOps."
        actions={
          <>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah pengguna
            </button>
          </>
        }
      />

      {created ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>Pengguna berhasil dibuat.</span>
          <button
            type="button"
            onClick={dismissCreated}
            aria-label="Tutup notifikasi"
            className="rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold">
            Daftar pengguna
          </h2>
          <span className="text-xs text-slate-400">
            Akses disesuaikan dengan peran
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">
                  Nama
                </th>
                <th className="px-6 py-3 font-semibold">
                  Email
                </th>
                <th className="px-6 py-3 font-semibold">
                  Peran
                </th>
                <th className="px-6 py-3 font-semibold">
                  Dibuat
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/70"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${roleStyles[user.role]}`}
                    >
                      {user.role} · {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {user.createdAt.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting
            ) {
              closeForm();
            }
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
        >
          <div className="mx-auto w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="user-modal-title"
                  className="text-xl font-semibold"
                >
                  Tambah pengguna
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Buat akun baru dan tentukan perannya.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Tutup form"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionData && !actionData.ok ? (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {actionData.message}
              </div>
            ) : null}

            <Form
              method="post"
              noValidate
              className="mt-5 space-y-4"
            >
              <div>
                <label
                  htmlFor="user-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Nama
                </label>
                <input
                  id="user-name"
                  name="name"
                  defaultValue={
                    actionData?.values?.name ?? ""
                  }
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={inputClass}
                  placeholder="Nadia Putri"
                />
                <FieldError message={fieldErrors.name} />
              </div>

              <div>
                <label
                  htmlFor="user-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="user-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={
                    actionData?.values?.email ?? ""
                  }
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={inputClass}
                  placeholder="nadia@peopleops.test"
                />
                <FieldError message={fieldErrors.email} />
              </div>

              <div>
                <label
                  htmlFor="user-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Kata sandi
                </label>
                <div className="relative">
                  <input
                    id="user-password"
                    name="password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    autoComplete="new-password"
                    aria-invalid={Boolean(
                      fieldErrors.password,
                    )}
                    className={`${inputClass} pr-11`}
                    placeholder="Minimal 8 karakter"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((visible) => !visible)
                    }
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FieldError message={fieldErrors.password} />
              </div>

              <div>
                <label
                  htmlFor="user-confirm-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Konfirmasi kata sandi
                </label>
                <div className="relative">
                  <input
                    id="user-confirm-password"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    aria-invalid={Boolean(
                      fieldErrors.confirmPassword,
                    )}
                    className={`${inputClass} pr-11`}
                    placeholder="Ulangi kata sandi"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (visible) => !visible,
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Sembunyikan konfirmasi kata sandi"
                        : "Tampilkan konfirmasi kata sandi"
                    }
                    aria-pressed={showConfirmPassword}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FieldError
                  message={fieldErrors.confirmPassword}
                />
              </div>

              <div>
                <label
                  htmlFor="user-role"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Peran
                </label>
                <select
                  id="user-role"
                  name="role"
                  defaultValue={selectedRole}
                  aria-invalid={Boolean(fieldErrors.role)}
                  className={inputClass}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.role} />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {submitting
                    ? "Menyimpan..."
                    : "Tambah pengguna"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
