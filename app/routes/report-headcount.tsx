import { useLoaderData } from "react-router";
import { Download, Printer } from "lucide-react";

import type { Route } from "./+types/report-headcount";
import { PageHeader } from "~/components/page-header";
import {
  hasRole,
  requireAuthenticatedUser,
} from "~/authorization.server";
import { formatDate, formatRupiah } from "~/lib/format";
import { getHeadcountReport } from "~/services/report.server";

export async function loader({
  context,
}: Route.LoaderArgs) {
  const user = requireAuthenticatedUser(context);
  const report = await getHeadcountReport();

  return {
    report,
    canExport: hasRole(user, ["ADMIN", "HR"]),
  };
}

export function meta() {
  return [{ title: "Headcount report - PeopleOps" }];
}

export default function ReportHeadcountPage() {
  const { report, canExport } =
    useLoaderData<typeof loader>();

  const maxPayroll = Math.max(
    1,
    ...report.departments.map((row) => row.payroll),
  );

  const kpis = [
    {
      label: "Total employees",
      value: report.totals.employees.toLocaleString(
        "id-ID",
      ),
    },
    {
      label: "Active",
      value: report.totals.active.toLocaleString("id-ID"),
    },
    {
      label: "Inactive",
      value: report.totals.inactive.toLocaleString(
        "id-ID",
      ),
    },
    {
      label: "Departments",
      value: report.totals.departments.toLocaleString(
        "id-ID",
      ),
    },
    {
      label: "Monthly payroll",
      value: formatRupiah(report.totals.payroll),
    },
    {
      label: "Average salary",
      value: formatRupiah(report.totals.averageSalary),
    },
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Reports", to: "/reports" },
          { label: "Headcount & payroll" },
        ]}
        title="Headcount & payroll"
        description={`Ringkasan komposisi karyawan, status aktif, dan distribusi payroll per department · ${formatDate(report.generatedAt)}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            {canExport ? (
              <a
                href="/reports/export"
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-700"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            ) : (
              <span className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-400">
                Export khusus HR/Admin
              </span>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
              {kpi.label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm print:break-inside-avoid print:shadow-none">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold">
              Payroll distribution
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Proporsi payroll tiap department terhadap total
              payroll.
            </p>
          </div>
          <p className="text-xs text-stone-400">
            Total {formatRupiah(report.totals.payroll)}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {report.departments.map((department) => (
            <div key={department.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800">
                    {department.name}
                  </span>
                  <span className="text-xs text-stone-400">
                    {department.code}
                  </span>
                </div>
                <span className="font-medium text-stone-600">
                  {formatRupiah(department.payroll)} ·{" "}
                  {department.payrollShare.toFixed(1)}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-stone-800"
                  style={{
                    width: `${
                      department.payroll > 0
                        ? Math.max(
                            2,
                            (department.payroll /
                              maxPayroll) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm print:break-inside-avoid print:shadow-none">
        <div className="border-b border-stone-200 px-6 py-4">
          <h2 className="font-serif text-2xl font-semibold">
            Department breakdown
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Headcount dan payroll per department.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-6 py-3 font-semibold">
                  Department
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Headcount
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Active
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Inactive
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Payroll
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Share
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {report.departments.map((department) => (
                <tr key={department.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-stone-800">
                      {department.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      {department.code}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right text-stone-700">
                    {department.headcount}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-700">
                    {department.active}
                  </td>
                  <td className="px-6 py-4 text-right text-stone-500">
                    {department.inactive}
                  </td>
                  <td className="px-6 py-4 text-right text-stone-700">
                    {formatRupiah(department.payroll)}
                  </td>
                  <td className="px-6 py-4 text-right text-stone-500">
                    {department.payrollShare.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="border-t border-stone-200 bg-stone-50 font-semibold">
              <tr>
                <td className="px-6 py-4">Total</td>
                <td className="px-6 py-4 text-right">
                  {report.totals.employees}
                </td>
                <td className="px-6 py-4 text-right text-emerald-700">
                  {report.totals.active}
                </td>
                <td className="px-6 py-4 text-right">
                  {report.totals.inactive}
                </td>
                <td className="px-6 py-4 text-right">
                  {formatRupiah(report.totals.payroll)}
                </td>
                <td className="px-6 py-4 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="text-xs text-stone-400 print:block">
        Generated at {formatDate(report.generatedAt)} ·
        Data diambil langsung dari database melalui server
        loader.
      </p>
    </div>
  );
}