import { beforeEach, describe, expect, it } from "vitest";

import { loader as reportLoader } from "~/routes/report-headcount";
import { loader as exportLoader } from "~/routes/report-export";
import { getHeadcountReport } from "~/services/report.server";
import { createContext } from "../helpers/context";
import { useTestDatabase } from "../helpers/database";
import { getRequest } from "../helpers/request";
import { capture, unwrap } from "../helpers/unwrap";
import { seedBaseData } from "../fixtures";

describe("headcount report", () => {
  useTestDatabase();

  let data: Awaited<ReturnType<typeof seedBaseData>>;

  beforeEach(async () => {
    data = await seedBaseData();
  });

  it("aggregates headcount and payroll", async () => {
    const report = await getHeadcountReport();

    expect(report.totals).toMatchObject({
      employees: 4,
      active: 4,
      inactive: 0,
      departments: 3,
      payroll: 46_500_000,
      averageSalary: 11_625_000,
    });

    expect(
      report.departments.find(
        (department) => department.code === "IT",
      ),
    ).toMatchObject({
      headcount: 2,
      payroll: 27_500_000,
    });
  });

  it("loads report page with export access for admin", async () => {
    const result = await reportLoader({
      request: getRequest("http://localhost/reports"),
      context: createContext(data.admin),
      params: {},
    } as never);

    expect(result.canExport).toBe(true);
    expect(result.report.totals.employees).toBe(4);
  });

  it("hides export for viewer", async () => {
    const result = await reportLoader({
      request: getRequest("http://localhost/reports"),
      context: createContext(data.viewer),
      params: {},
    } as never);

    expect(result.canExport).toBe(false);
  });

  it("exports csv for admin", async () => {
    const result = await exportLoader({
      request: getRequest(
        "http://localhost/reports/export",
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(200);
    expect(
      unwrapped.headers.get("Content-Type"),
    ).toContain("text/csv");
    expect(
      unwrapped.headers.get("Content-Disposition"),
    ).toContain("attachment");
    expect(String(unwrapped.data)).toContain("TOTAL");
    expect(String(unwrapped.data)).toContain(
      "Information Technology",
    );
  });

  it("blocks viewer from csv export", async () => {
    const { response } = await capture(
      exportLoader({
        request: getRequest(
          "http://localhost/reports/export",
        ),
        context: createContext(data.viewer),
        params: {},
      } as never),
    );

    expect(response?.status).toBe(403);
  });
});
