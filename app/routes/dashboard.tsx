import { useLoaderData } from "react-router";
import {
  Building2,
  ClipboardList,
  Users,
} from "lucide-react";

import type { Route } from "./+types/dashboard";
import { PageHeader } from "~/components/page-header";
import { requireAuthenticatedUser } from "~/authorization.server";
import {
  AssignmentEntity,
  DepartmentEntity,
  EmployeeEntity,
} from "~/db/entities";
import { getInitializedDataSource } from "~/db.server";
import { ROLE_LABELS } from "~/lib/constants";

export async function loader({
  context,
}: Route.LoaderArgs) {
  const user = requireAuthenticatedUser(context);

  const dataSource = await getInitializedDataSource();

  const [employees, departments, assignments] =
    await Promise.all([
      dataSource.getRepository(EmployeeEntity).count(),
      dataSource.getRepository(DepartmentEntity).count(),
      dataSource.getRepository(AssignmentEntity).count(),
    ]);

  return {
    user,
    stats: {
      employees,
      departments,
      assignments,
    },
    today: new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
    }).format(new Date()),
  };
}

export function meta() {
  return [{ title: "Dashboard - PeopleOps" }];
}

export default function DashboardPage() {
  const { user, stats, today } = useLoaderData<typeof loader>();

  const cards = [
    {
      label: "Employees",
      value: stats.employees,
      icon: Users,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Departments",
      value: stats.departments,
      icon: Building2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Assignments",
      value: stats.assignments,
      icon: ClipboardList,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Dashboard" },
        ]}
        title={`Welcome back, ${user.name}`}
        description={`${today} · ${ROLE_LABELS[user.role]}`}
        actions={
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Session active
          </span>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div
              className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {value.toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Next module
          </p>
          <h2 className="mt-3 text-xl font-semibold">
            Employee CRUD with server-side loaders
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Tahap berikutnya menambahkan list, create, detail,
            edit, delete, upload foto, dan feedback lewat
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              useActionData
            </code>
            .
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Current account
          </p>
          <p className="mt-3 truncate text-lg font-semibold">
            {user.email}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Role: {ROLE_LABELS[user.role]}
          </p>
        </div>
      </section>
    </div>
  );
}