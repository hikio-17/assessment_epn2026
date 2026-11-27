import {
  DepartmentEntity,
  EmployeeEntity,
} from "../db/entities";
import { getInitializedDataSource } from "../db.server";
import type {
  DepartmentReportRow,
  HeadcountReport,
} from "../types";

type DepartmentReportRaw = {
  department_id: number;
  department_code: string;
  department_name: string;
  total: string | number;
  active: string | number;
  payroll: string | number;
};

export async function getHeadcountReport(): Promise<HeadcountReport> {
  const dataSource = await getInitializedDataSource();

  const raw = await dataSource
    .getRepository(DepartmentEntity)
    .createQueryBuilder("d")
    .leftJoin(
      "Employee",
      "e",
      "e.department_id = d.id",
    )
    .select("d.id", "department_id")
    .addSelect("d.code", "department_code")
    .addSelect("d.name", "department_name")
    .addSelect("COUNT(e.id)", "total")
    .addSelect(
      "COUNT(e.id) FILTER (WHERE e.status = 'ACTIVE')",
      "active",
    )
    .addSelect(
      "COALESCE(SUM(e.salary), 0)",
      "payroll",
    )
    .groupBy("d.id")
    .addGroupBy("d.code")
    .addGroupBy("d.name")
    .getRawMany<DepartmentReportRaw>();

  const departments: DepartmentReportRow[] = raw
    .map((row) => {
      const headcount = Number(row.total);
      const active = Number(row.active);

      return {
        id: Number(row.department_id),
        code: row.department_code,
        name: row.department_name,
        headcount,
        active,
        inactive: headcount - active,
        payroll: Number(row.payroll),
        payrollShare: 0,
      };
    })
    .sort(
      (a, b) =>
        b.headcount - a.headcount ||
        a.name.localeCompare(b.name),
    );

  const totals = {
    employees: departments.reduce(
      (sum, row) => sum + row.headcount,
      0,
    ),
    active: departments.reduce(
      (sum, row) => sum + row.active,
      0,
    ),
    inactive: departments.reduce(
      (sum, row) => sum + row.inactive,
      0,
    ),
    departments: departments.length,
    payroll: departments.reduce(
      (sum, row) => sum + row.payroll,
      0,
    ),
    averageSalary: 0,
  };

  totals.averageSalary = totals.employees
    ? Math.round(totals.payroll / totals.employees)
    : 0;

  for (const department of departments) {
    department.payrollShare = totals.payroll
      ? Math.round(
          (department.payroll / totals.payroll) * 1000,
        ) / 10
      : 0;
  }

  return {
    totals,
    departments,
    generatedAt: new Date().toISOString(),
  };
}