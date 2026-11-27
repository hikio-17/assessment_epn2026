import {
    Link,
    useLoaderData,
} from "react-router";
import {
    Building2,
    Briefcase,
    CalendarDays,
    Mail,
    Wallet,
    type LucideIcon,
    Pencil,
} from "lucide-react";

import type { Route } from "./+types/employee-detail";
import {
    hasRole,
    requireAuthenticatedUser,
} from "~/authorization.server";
import { EmployeeAvatar } from "~/components/employee-avatar";
import { PageHeader } from "~/components/page-header";
import { NotFoundError } from "~/lib/errors";
import { EMPLOYEE_STATUS_LABELS } from "~/lib/constants";
import {
    formatDate,
    formatRupiah,
} from "~/lib/format";
import { parseEmployeeId } from "~/lib/query";
import { getEmployeeById } from "~/services/employee.server";

export async function loader({
    params,
    context,
}: Route.LoaderArgs) {
    const user = requireAuthenticatedUser(context);
    const id = parseEmployeeId(params.id);

    if (!id) {
        throw new Response("Employee not found", {
            status: 404,
        });
    }

    try {
        const employee = await getEmployeeById(id);

        return {
            employee,
            canManage: hasRole(user, ["ADMIN", "HR"]),
        };
    } catch (error) {
        if (error instanceof NotFoundError) {
            throw new Response("Employee not found", {
                status: 404,
            });
        }

        throw error;
    }
}

export function meta() {
    return [{ title: "Employee detail - PeopleOps" }];
}

const statusStyles = {
    ACTIVE:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    INACTIVE:
        "border-slate-200 bg-slate-100 text-slate-500",
} as const;

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Icon className="h-4 w-4" />
                {label}
            </div>
            <p className="mt-2 break-words text-sm font-medium text-slate-800">
                {value}
            </p>
        </div>
    );
}

export default function EmployeeDetailPage() {
    const { employee, canManage } =
        useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <PageHeader
                breadcrumbs={[
                    { label: "Workspace", to: "/" },
                    { label: "Employees", to: "/employees" },
                    { label: employee.name },
                ]}
                title="Employee detail"
                description={`${employee.name} · ${employee.position}`}
                actions={
                    <>
                        {canManage ? (
                            <Link
                                to={`/employees/${employee.id}/edit`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                            </Link>
                        ) : null}

                        <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                canManage
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-white text-slate-500"
                            }`}
                        >
                            {canManage
                                ? "HR / Admin access"
                                : "Read-only access"}
                        </span>
                    </>
                }
            />

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col items-center text-center">
                        <EmployeeAvatar
                            name={employee.name}
                            photoUrl={employee.photoUrl}
                            className="h-28 w-28 rounded-3xl text-3xl shadow-sm"
                        />

                        <h1 className="mt-5 text-2xl font-bold tracking-tight">
                            {employee.name}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {employee.position}
                        </p>

                        <span
                            className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[employee.status]}`}
                        >
                            {
                                EMPLOYEE_STATUS_LABELS[
                                employee.status
                                ]
                            }
                        </span>
                    </div>

                    <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-slate-500">Employee ID</dt>
                            <dd className="font-semibold text-slate-800">
                                #{employee.id}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-slate-500">Version</dt>
                            <dd className="font-semibold text-slate-800">
                                {employee.version}
                            </dd>
                        </div>
                    </dl>
                </aside>

                <section className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Employee information
                        </h2>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <InfoRow
                                icon={Mail}
                                label="Email"
                                value={employee.email}
                            />
                            <InfoRow
                                icon={Briefcase}
                                label="Position"
                                value={employee.position}
                            />
                            <InfoRow
                                icon={Building2}
                                label="Department"
                                value={
                                    employee.department
                                        ? `${employee.department.code} — ${employee.department.name}`
                                        : "—"
                                }
                            />
                            <InfoRow
                                icon={Wallet}
                                label="Salary"
                                value={formatRupiah(employee.salary)}
                            />
                            <InfoRow
                                icon={CalendarDays}
                                label="Created at"
                                value={formatDate(employee.createdAt)}
                            />
                            <InfoRow
                                icon={CalendarDays}
                                label="Updated at"
                                value={formatDate(employee.updatedAt)}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}