import {
  Link,
  useLoaderData,
} from "react-router";

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

  const employeeRepository =
    dataSource.getRepository(EmployeeEntity);
  const departmentRepository =
    dataSource.getRepository(DepartmentEntity);
  const assignmentRepository =
    dataSource.getRepository(AssignmentEntity);

  const [
    employees,
    departments,
    activeAssignments,
    recentEmployees,
    latestAssignments,
  ] = await Promise.all([
    employeeRepository.count(),
    departmentRepository.count(),
    assignmentRepository.countBy({
      status: "ACTIVE",
    }),
    employeeRepository.find({
      order: { createdAt: "DESC" },
      take: 5,
      relations: { department: true },
    }),
    assignmentRepository.find({
      where: { status: "ACTIVE" },
      order: { updatedAt: "DESC" },
      take: 5,
      relations: {
        department: true,
        employee: true,
      },
    }),
  ]);

  return {
    user,
    stats: {
      employees,
      departments,
      activeAssignments,
    },
    recentEmployees: recentEmployees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department?.name ?? "—",
    })),
    latestAssignments: latestAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      employee: assignment.employee?.name ?? "—",
      department: assignment.department?.name ?? "—",
    })),
    today: new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
    }).format(new Date()),
  };
}

export function meta() {
  return [{ title: "Dasbor - PeopleOps" }];
}

export default function DashboardPage() {
  const {
    user,
    stats,
    recentEmployees,
    latestAssignments,
    today,
  } = useLoaderData<typeof loader>();

  const cards = [
    {
      label: "Karyawan",
      value: stats.employees,
      to: "/employees",
    },
    {
      label: "Departemen",
      value: stats.departments,
      to: "/reports",
    },
    {
      label: "Penugasan aktif",
      value: stats.activeAssignments,
      to: "/assignments",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Dasbor" },
        ]}
        title={`Halo, ${user.name}`}
        description={`${today} · ${ROLE_LABELS[user.role]}`}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, to }) => (
          <Link
            key={label}
            to={to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
          >
            <p className="text-sm font-medium text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {value.toLocaleString("id-ID")}
            </p>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold">
              Karyawan terbaru
            </h2>
            <Link
              to="/employees"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Lihat semua
            </Link>
          </div>

          {recentEmployees.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">
              Belum ada data karyawan.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentEmployees.map((employee) => (
                <li key={employee.id}>
                  <Link
                    to={`/employees/${employee.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {employee.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {employee.position} · {employee.department}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      Lihat
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold">
              Penugasan aktif
            </h2>
            <Link
              to="/assignments"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Lihat semua
            </Link>
          </div>

          {latestAssignments.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">
              Belum ada penugasan aktif.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {latestAssignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className="px-5 py-3.5"
                >
                  <p className="truncate text-sm font-medium">
                    {assignment.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {assignment.employee} ·{" "}
                    {assignment.department}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
