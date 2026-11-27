import { beforeEach, describe, expect, it } from "vitest";

import { loader as departmentsLoader } from "~/routes/api.departments";
import { loader as departmentEmployeesLoader } from "~/routes/api.department-employees";
import {
  action as assignmentsAction,
  loader as assignmentsLoader,
} from "~/routes/api.assignments";
import {
  action as assignmentAction,
  loader as assignmentLoader,
} from "~/routes/api.assignment";
import { createContext } from "../helpers/context";
import { useTestDatabase } from "../helpers/database";
import {
  getRequest,
  jsonRequest,
} from "../helpers/request";
import { unwrap } from "../helpers/unwrap";
import { seedBaseData } from "../fixtures";

describe("assignment API", () => {
  useTestDatabase();

  let data: Awaited<ReturnType<typeof seedBaseData>>;

  beforeEach(async () => {
    data = await seedBaseData();
  });

  it("reads departments and child employees", async () => {
    const departments = await unwrap(
      await departmentsLoader({
        request: getRequest(
          "http://localhost/api/departments",
        ),
        context: createContext(data.viewer),
        params: {},
      } as never),
    );

    expect(departments.status).toBe(200);
    expect(
      (departments.data as { data: unknown[] }).data,
    ).toHaveLength(3);

    const employees = await unwrap(
      await departmentEmployeesLoader({
        request: getRequest(
          `http://localhost/api/departments/${data.departments.it.id}/employees`,
        ),
        context: createContext(data.viewer),
        params: {
          departmentId: String(
            data.departments.it.id,
          ),
        },
      } as never),
    );

    expect(
      (employees.data as { data: unknown[] }).data,
    ).toHaveLength(2);
  });

  it("creates, updates, and deletes assignment", async () => {
    const created = await unwrap(
      await assignmentsAction({
        request: jsonRequest(
          "http://localhost/api/assignments",
          {
            title: "New assignment",
            departmentId: data.departments.it.id,
            employeeId: data.employees.siti.id,
            status: "ACTIVE",
          },
        ),
        context: createContext(data.admin),
        params: {},
      } as never),
    );

    expect(created.status).toBe(201);
    const assignment = (
      created.data as {
        data: {
          id: number;
          version: number;
        };
      }
    ).data;

    expect(assignment.version).toBe(1);

    const updated = await unwrap(
      await assignmentAction({
        request: jsonRequest(
          `http://localhost/api/assignments/${assignment.id}`,
          {
            title: "Updated assignment",
            departmentId: data.departments.it.id,
            employeeId: data.employees.siti.id,
            status: "ACTIVE",
            version: 1,
          },
          { method: "PUT" },
        ),
        context: createContext(data.hr),
        params: {
          id: String(assignment.id),
        },
      } as never),
    );

    expect(updated.status).toBe(200);
    expect(
      (updated.data as { data: { version: number } })
        .data.version,
    ).toBe(2);

    const stale = await unwrap(
      await assignmentAction({
        request: jsonRequest(
          `http://localhost/api/assignments/${assignment.id}`,
          {
            title: "Stale",
            departmentId: data.departments.it.id,
            employeeId: data.employees.siti.id,
            status: "ACTIVE",
            version: 1,
          },
          { method: "PUT" },
        ),
        context: createContext(data.admin),
        params: {
          id: String(assignment.id),
        },
      } as never),
    );

    expect(stale.status).toBe(409);

    const deleted = await unwrap(
      await assignmentAction({
        request: new Request(
          `http://localhost/api/assignments/${assignment.id}`,
          { method: "DELETE" },
        ),
        context: createContext(data.admin),
        params: {
          id: String(assignment.id),
        },
      } as never),
    );

    expect(deleted.status).toBe(200);

    const missing = await unwrap(
      await assignmentLoader({
        request: new Request(
          `http://localhost/api/assignments/${assignment.id}`,
        ),
        context: createContext(data.admin),
        params: {
          id: String(assignment.id),
        },
      } as never),
    );

    expect(missing.status).toBe(404);
  });

  it("rejects duplicate active assignment", async () => {
    const body = {
      title: "Duplicate",
      departmentId: data.departments.it.id,
      employeeId: data.employees.angga.id,
      status: "ACTIVE",
    };

    const result = await unwrap(
      await assignmentsAction({
        request: jsonRequest(
          "http://localhost/api/assignments",
          body,
        ),
        context: createContext(data.admin),
        params: {},
      } as never),
    );

    expect(result.status).toBe(409);
  });

  it("rejects employee outside selected department", async () => {
    const result = await unwrap(
      await assignmentsAction({
        request: jsonRequest(
          "http://localhost/api/assignments",
          {
            title: "Mismatch",
            departmentId: data.departments.hr.id,
            employeeId: data.employees.siti.id,
            status: "ACTIVE",
          },
        ),
        context: createContext(data.admin),
        params: {},
      } as never),
    );

    expect(result.status).toBe(400);
  });

  it("handles invalid json", async () => {
    const request = new Request(
      "http://localhost/api/assignments",
      {
        method: "POST",
        body: "{broken",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const result = await unwrap(
      await assignmentsAction({
        request,
        context: createContext(data.admin),
        params: {},
      } as never),
    );

    expect(result.status).toBe(400);
  });

  it("enforces auth and role in handlers", async () => {
    const unauth = await unwrap(
      await assignmentsLoader({
        request: getRequest(
          "http://localhost/api/assignments",
        ),
        context: createContext(),
        params: {},
      } as never),
    );

    expect(unauth.status).toBe(401);

    const viewer = await unwrap(
      await assignmentsAction({
        request: jsonRequest(
          "http://localhost/api/assignments",
          {
            title: "Viewer",
            departmentId: data.departments.it.id,
            employeeId: data.employees.siti.id,
            status: "ACTIVE",
          },
        ),
        context: createContext(data.viewer),
        params: {},
      } as never),
    );

    expect(viewer.status).toBe(403);
  });
});
