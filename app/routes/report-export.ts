import type { Route } from "./+types/report-export";
import {
  hasRole,
  requireAuthenticatedUser,
} from "~/authorization.server";
import { toCsv } from "~/lib/csv";
import {
  requireApiAuthMiddleware,
  requireRoleMiddleware,
} from "~/middleware/auth.server";
import { getHeadcountReport } from "~/services/report.server";

export const middleware = [
  requireApiAuthMiddleware,
  requireRoleMiddleware(["ADMIN", "HR"]),
];

export async function loader({
  context,
}: Route.LoaderArgs) {
  const user = requireAuthenticatedUser(context);

  if (!hasRole(user, ["ADMIN", "HR"])) {
    throw new Response("Forbidden", {
      status: 403,
      statusText: "Forbidden",
    });
  }

  const report = await getHeadcountReport();

  const rows: Array<Array<string | number>> = [
    [
      "Department Code",
      "Department",
      "Headcount",
      "Active",
      "Inactive",
      "Payroll",
      "Payroll Share (%)",
    ],
    ...report.departments.map((department) => [
      department.code,
      department.name,
      department.headcount,
      department.active,
      department.inactive,
      department.payroll,
      department.payrollShare,
    ]),
    [
      "TOTAL",
      "",
      report.totals.employees,
      report.totals.active,
      report.totals.inactive,
      report.totals.payroll,
      "100",
    ],
  ];

  const csv = toCsv(rows);
  const date = report.generatedAt.slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="peopleops-headcount-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}