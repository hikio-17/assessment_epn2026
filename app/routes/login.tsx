import { useState } from "react";
import {
  Form,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  UserRound,
  Users,
} from "lucide-react";

import type { Route } from "./+types/login";
import { verifyCredentials } from "~/auth.server";
import { getOptionalUser } from "~/authorization.server";
import { safeRedirect } from "~/lib/redirect";
import {
  loginSchema,
  toFieldErrors,
} from "~/lib/validation";
import { commitSession, getSession } from "~/session.server";

type LoginLoaderData = {
  redirectTo: string;
};

type LoginActionData = {
  ok: false;
  message: string;
  fieldErrors: Record<string, string>;
  values: {
    email: string;
    redirectTo: string;
    remember: boolean;
  };
};

const demoAccounts = [
  {
    role: "Administrator",
    email: "admin@peopleops.test",
  },
  {
    role: "Staf HR",
    email: "hr@peopleops.test",
  },
  {
    role: "Viewer",
    email: "viewer@peopleops.test",
  },
];

const features = [
  {
    icon: Users,
    title: "Kelola karyawan",
    description:
      "Data, status, dan profil dalam satu tempat.",
  },
  {
    icon: ClipboardList,
    title: "Pantau penugasan",
    description:
      "Lihat pekerjaan aktif dan progresnya.",
  },
  {
    icon: BarChart3,
    title: "Lihat laporan",
    description:
      "Headcount dan payroll yang mudah dibaca.",
  },
];

export async function loader({
  request,
  context,
}: Route.LoaderArgs) {
  if (getOptionalUser(context)) {
    return redirect("/");
  }

  const url = new URL(request.url);

  return {
    redirectTo: safeRedirect(
      url.searchParams.get("redirectTo"),
    ),
  } satisfies LoginLoaderData;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const remember = formData.get("remember") === "on";

  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    redirectTo: String(
      formData.get("redirectTo") ?? "/",
    ),
  };

  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return data(
      {
        ok: false,
        message: "Periksa kembali email dan kata sandi.",
        fieldErrors: toFieldErrors(parsed.error),
        values: {
          email: raw.email,
          redirectTo: raw.redirectTo,
          remember,
        },
      } satisfies LoginActionData,
      { status: 400 },
    );
  }

  const user = await verifyCredentials(
    parsed.data.email,
    parsed.data.password,
  );

  if (!user) {
    return data(
      {
        ok: false,
        message: "Email atau kata sandi tidak sesuai.",
        fieldErrors: {},
        values: {
          email: parsed.data.email,
          redirectTo: parsed.data.redirectTo,
          remember,
        },
      } satisfies LoginActionData,
      { status: 400 },
    );
  }

  const session = await getSession(
    request.headers.get("Cookie"),
  );
  session.set("userId", user.id);

  return redirect(safeRedirect(parsed.data.redirectTo), {
    headers: {
      "Set-Cookie": await commitSession(
        session,
        remember
          ? { maxAge: 60 * 60 * 24 * 30 }
          : undefined,
      ),
    },
  });
}

export function meta() {
  return [{ title: "Masuk - PeopleOps" }];
}

export default function LoginPage() {
  const { redirectTo } = useLoaderData<LoginLoaderData>();
  const actionData = useActionData<LoginActionData>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [showPassword, setShowPassword] = useState(false);

  const emailError = actionData?.fieldErrors.email;
  const passwordError = actionData?.fieldErrors.password;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#edf4ff] via-[#f6f9ff] to-[#e8f0ff] text-slate-900">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-12 xl:gap-20">
        <aside className="hidden lg:block lg:w-full lg:max-w-xl">
          <div className="relative z-10 flex flex-col">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold tracking-tight">
                  PeopleOps
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  HR workspace
                </p>
              </div>
            </div>

            <div className="mt-16 max-w-xl">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 xl:text-5xl">
                Satu tempat untuk mengelola tim.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
                Data karyawan, penugasan, dan laporan dalam
                satu workspace yang rapi.
              </p>
            </div>

            <ul className="mt-12 max-w-md space-y-5">
              {features.map(
                ({ icon: Icon, title, description }) => (
                  <li
                    key={title}
                    className="flex items-start gap-4"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {description}
                      </p>
                    </div>
                  </li>
                ),
              )}
            </ul>

            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((item) => (
                  <span
                    key={item}
                    className="grid h-9 w-9 place-items-center rounded-full border-2 border-white/80 bg-blue-100 text-blue-600"
                  >
                    <UserRound className="h-4 w-4" />
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Dipakai tim HR untuk kerja sehari-hari.
              </p>
            </div>
          </div>
        </aside>

        <section className="relative w-full lg:max-w-md">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-5 pb-16 pt-8 text-white lg:hidden">
            <div className="mx-auto flex max-w-md items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-semibold">
                  PeopleOps
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-100">
                  HR workspace
                </p>
              </div>
            </div>
            <p className="mx-auto mt-8 max-w-md text-lg font-medium leading-7 text-blue-50">
              Kelola tim dalam satu tempat.
            </p>
          </div>

          <div className="relative z-10 mx-auto -mt-8 w-full max-w-md px-5 pb-10 lg:mt-0 lg:px-0">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
              <div className="flex items-center justify-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
                  <Users className="h-5 w-5" />
                </span>
                <span className="text-xl font-semibold tracking-tight">
                  PeopleOps
                </span>
              </div>

              <div className="mt-6 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Selamat datang kembali
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Masuk untuk mengakses dasbor PeopleOps.
                </p>
              </div>

              {actionData?.message ? (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {actionData.message}
                </div>
              ) : null}

              <Form
                method="post"
                noValidate
                className="mt-6 space-y-4"
              >
                <input
                  type="hidden"
                  name="redirectTo"
                  value={redirectTo}
                />

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      defaultValue={
                        actionData?.values.email ?? ""
                      }
                      aria-invalid={Boolean(emailError)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="nama@perusahaan.com"
                    />
                  </div>
                  {emailError ? (
                    <p className="mt-1.5 text-xs text-rose-600">
                      {emailError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Kata sandi
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword ? "text" : "password"
                      }
                      autoComplete="current-password"
                      aria-invalid={Boolean(passwordError)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Masukkan kata sandi"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (visible) => !visible,
                        )
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
                  {passwordError ? (
                    <p className="mt-1.5 text-xs text-rose-600">
                      {passwordError}
                    </p>
                  ) : null}
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="remember"
                    defaultChecked={
                      actionData?.values.remember ?? false
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Ingat saya
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {submitting ? "Memproses..." : "Masuk"}
                </button>
              </Form>

              <p className="mt-5 text-center text-xs text-slate-400">
                Butuh akses? Hubungi administrator HR.
              </p>
            </div>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-600">
                  Akun demo
                </p>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  Password123!
                </span>
              </div>

              <div className="mt-2 divide-y divide-slate-100">
                {demoAccounts.map((account) => (
                  <div
                    key={account.email}
                    className="flex items-center justify-between gap-3 py-2 text-xs"
                  >
                    <span className="font-medium text-slate-600">
                      {account.role}
                    </span>
                    <code className="text-slate-500">
                      {account.email}
                    </code>
                  </div>
                ))}
              </div>
            </section>

            <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-slate-400">
              PeopleOps · Akses internal
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
