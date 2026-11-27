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
    Database,
    Lock,
    Mail,
    ShieldCheck,
    UserRound,
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
    };
};

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
                message: "Please check the form and try again.",
                fieldErrors: toFieldErrors(parsed.error),
                values: {
                    email: raw.email,
                    redirectTo: raw.redirectTo,
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
                message: "Invalid email or password.",
                fieldErrors: {},
                values: {
                    email: parsed.data.email,
                    redirectTo: parsed.data.redirectTo,
                },
            } satisfies LoginActionData,
            { status: 400 },
        );
    }

    const session = await getSession(
        request.headers.get("Cookie"),
    );
    session.set("userId", user.id);

    return redirect(
        safeRedirect(parsed.data.redirectTo),
        {
            headers: {
                "Set-Cookie": await commitSession(session),
            },
        },
    );
}

export function meta() {
    return [{ title: "Sign in - PeopleOps" }];
}

export default function LoginPage() {
    const { redirectTo } = useLoaderData<LoginLoaderData>();
    const actionData = useActionData<LoginActionData>();
    const navigation = useNavigation();
    const submitting = navigation.state === "submitting";

    const emailError = actionData?.fieldErrors.email;
    const passwordError = actionData?.fieldErrors.password;

    const features = [
        { icon: UserRound, label: "Session auth" },
        { icon: Database, label: "TypeORM + Postgres" },
        { icon: ShieldCheck, label: "RBAC ready" },
    ];

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
                <section className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
                                <ShieldCheck className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="text-lg font-semibold">PeopleOps</p>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                    HR Management
                                </p>
                            </div>
                        </div>

                        <h1 className="mt-16 max-w-lg text-5xl font-bold leading-tight tracking-tight">
                            One secure workspace for your people operations.
                        </h1>
                        <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
                            Employees, departments, assignments, uploads, and
                            reports — all behind a server-side session and
                            role-based access control.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {features.map(({ icon: Icon, label }) => (
                            <div
                                key={label}
                                className="rounded-2xl border border-white/10 bg-white/5 p-4"
                            >
                                <Icon className="h-5 w-5 text-indigo-300" />
                                <p className="mt-3 text-sm text-slate-300">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">
                        <div className="mb-8 lg:hidden">
                            <div className="inline-flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500">
                                    <ShieldCheck className="h-5 w-5" />
                                </span>
                                <p className="text-lg font-semibold">PeopleOps</p>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
                                Welcome back
                            </p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight">
                                Sign in
                            </h2>
                            <p className="mt-2 text-sm text-slate-400">
                                Use one of the demo accounts below.
                            </p>

                            {actionData?.message ? (
                                <div
                                    role="alert"
                                    className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
                                >
                                    {actionData.message}
                                </div>
                            ) : null}

                            <Form
                                method="post"
                                noValidate
                                className="mt-6 space-y-5"
                            >
                                <input
                                    type="hidden"
                                    name="redirectTo"
                                    value={redirectTo}
                                />

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-sm font-medium text-slate-300"
                                    >
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            defaultValue={
                                                actionData?.values.email ?? ""
                                            }
                                            aria-invalid={Boolean(emailError)}
                                            className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-400 focus:outline-none"
                                            placeholder="admin@peopleops.test"
                                        />
                                    </div>
                                    {emailError ? (
                                        <p className="mt-2 text-xs text-rose-300">
                                            {emailError}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-sm font-medium text-slate-300"
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            aria-invalid={Boolean(passwordError)}
                                            className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-400 focus:outline-none"
                                            placeholder="Password123!"
                                        />
                                    </div>
                                    {passwordError ? (
                                        <p className="mt-2 text-xs text-rose-300">
                                            {passwordError}
                                        </p>
                                    ) : null}
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? "Signing in..." : "Sign in"}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </Form>

                            <div className="mt-8 border-t border-white/10 pt-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Demo accounts
                                </p>
                                <div className="mt-3 space-y-2 text-xs text-slate-400">
                                    <p>
                                        <span className="text-slate-200">
                                            admin@peopleops.test
                                        </span>{" "}
                                        / Password123! — ADMIN
                                    </p>
                                    <p>
                                        <span className="text-slate-200">
                                            hr@peopleops.test
                                        </span>{" "}
                                        / Password123! — HR
                                    </p>
                                    <p>
                                        <span className="text-slate-200">
                                            viewer@peopleops.test
                                        </span>{" "}
                                        / Password123! — VIEWER
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}