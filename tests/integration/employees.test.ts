import { mkdir, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { EmployeeEntity } from "~/db/entities";
import { action as editAction } from "~/routes/employee-edit";
import { action as createAction } from "~/routes/employee-new";
import {
  action as listAction,
  loader as listLoader,
} from "~/routes/employees-list";
import { getTestDataSource, useTestDatabase } from "../helpers/database";
import { createContext } from "../helpers/context";
import { formRequest, getRequest } from "../helpers/request";
import { unwrap } from "../helpers/unwrap";
import { seedBaseData } from "../fixtures";

const uploadDir = path.join(
  os.tmpdir(),
  `peopleops-employee-tests-${process.pid}`,
);

function uploadFile() {
  return new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
    "photo.png",
    { type: "image/png" },
  );
}

async function uploadFiles() {
  try {
    return await readdir(uploadDir);
  } catch {
    return [];
  }
}

function employeeForm(
  departmentId: number,
  overrides: Record<string, string> = {},
) {
  return {
    name: "New Employee",
    email: "new.employee@test.local",
    position: "Engineer",
    departmentId: String(departmentId),
    salary: "10000000",
    status: "ACTIVE",
    ...overrides,
  };
}

describe("employee routes", () => {
  useTestDatabase();

  let data: Awaited<ReturnType<typeof seedBaseData>>;

  beforeEach(async () => {
    await rm(uploadDir, { recursive: true, force: true });
    await mkdir(uploadDir, { recursive: true });
    process.env.UPLOAD_DIR = uploadDir;
    data = await seedBaseData();
  });

  afterAll(async () => {
    await rm(uploadDir, { recursive: true, force: true });
  });

  it("reads employee list with search and department filter", async () => {
    const result = await listLoader({
      request: getRequest(
        `http://localhost/employees?q=Angga&department=${data.departments.it.id}`,
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    expect(result).toMatchObject({
      total: 1,
      canManage: true,
    });
    expect(result.employees[0].name).toBe("Angga Marta");
  });

  it("returns read-only list for viewer", async () => {
    const result = await listLoader({
      request: getRequest("http://localhost/employees"),
      context: createContext(data.viewer),
      params: {},
    } as never);

    expect(result.canManage).toBe(false);
  });

  it("creates an employee", async () => {
    const result = await createAction({
      request: formRequest(
        "http://localhost/employees/new",
        employeeForm(data.departments.it.id),
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);
    expect(unwrapped.status).toBe(200);
    expect(unwrapped.data).toMatchObject({
      ok: true,
    });

    const dataSource = await getTestDataSource();
    const count = await dataSource
      .getRepository(EmployeeEntity)
      .countBy({ email: "new.employee@test.local" });

    expect(count).toBe(1);
  });

  it("creates and updates employee through list action modal", async () => {
    const created = await listAction({
      request: formRequest(
        "http://localhost/employees?form=create",
        {
          intent: "create",
          ...employeeForm(data.departments.it.id),
          email: "modal.employee@test.local",
        },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    expect((await unwrap(created)).status).toBe(200);

    const updated = await listAction({
      request: formRequest(
        "http://localhost/employees?form=edit&id=1",
        {
          intent: "update",
          employeeId: String(data.employees.angga.id),
          ...employeeForm(data.departments.it.id, {
            name: "Angga Modal",
            email: "angga@test.local",
          }),
        },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const updatedData = await unwrap(updated);
    expect(updatedData.status).toBe(200);
    expect(
      (updatedData.data as { employee: { name: string } })
        .employee.name,
    ).toBe("Angga Modal");
  });

  it("rejects empty fields and invalid department", async () => {
    const empty = await createAction({
      request: formRequest(
        "http://localhost/employees/new",
        {
          name: "",
          email: "",
          position: "",
          departmentId: "",
          salary: "",
          status: "ACTIVE",
        },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const emptyResult = await unwrap(empty);
    expect(emptyResult.status).toBe(400);
    expect(
      (emptyResult.data as { fieldErrors: unknown })
        .fieldErrors,
    ).toBeTruthy();

    const invalid = await createAction({
      request: formRequest(
        "http://localhost/employees/new",
        employeeForm(999999),
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const invalidResult = await unwrap(invalid);
    expect(invalidResult.status).toBe(400);
    expect(
      (invalidResult.data as { fieldErrors: Record<string, string> })
        .fieldErrors.departmentId,
    ).toBeTruthy();
  });

  it("rejects duplicate employee email", async () => {
    const result = await createAction({
      request: formRequest(
        "http://localhost/employees/new",
        employeeForm(data.departments.it.id, {
          email: "angga@test.local",
        }),
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);
    expect(unwrapped.status).toBe(400);
    expect(
      (unwrapped.data as { fieldErrors: Record<string, string> })
        .fieldErrors.email,
    ).toBeTruthy();
  });

  it("rolls back database and removes file on failed upload transaction", async () => {
    const result = await createAction({
      request: formRequest(
        "http://localhost/employees/new",
        {
          ...employeeForm(999999),
          photo: uploadFile(),
        },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);
    expect(unwrapped.status).toBe(400);
    expect(await uploadFiles()).toEqual([]);

    const dataSource = await getTestDataSource();
    const count = await dataSource
      .getRepository(EmployeeEntity)
      .countBy({ email: "new.employee@test.local" });

    expect(count).toBe(0);
  });

  it("updates employee and increments version", async () => {
    const result = await editAction({
      request: formRequest(
        `http://localhost/employees/${data.employees.angga.id}/edit`,
        employeeForm(data.departments.it.id, {
          name: "Angga Updated",
          email: "angga@test.local",
        }),
      ),
      context: createContext(data.admin),
      params: {
        id: String(data.employees.angga.id),
      },
    } as never);

    const unwrapped = await unwrap(result);
    expect(unwrapped.status).toBe(200);
    expect(
      (unwrapped.data as { employee: { version: number } })
        .employee.version,
    ).toBe(2);
  });

  it("deletes employee and photo", async () => {
    const created = await createAction({
      request: formRequest(
        "http://localhost/employees/new",
        {
          ...employeeForm(data.departments.it.id),
          photo: uploadFile(),
        },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const createdData = await unwrap(created);
    const employee = (
      createdData.data as {
        employee: { id: number; photoPath: string };
      }
    ).employee;

    expect(await uploadFiles()).toContain(
      employee.photoPath,
    );

    const deleted = await listAction({
      request: formRequest(
        "http://localhost/employees",
        {
          intent: "delete",
          employeeId: String(employee.id),
        },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    expect((await unwrap(deleted)).status).toBe(200);
    expect(await uploadFiles()).not.toContain(
      employee.photoPath,
    );
  });

  it("returns 404 when deleting missing employee", async () => {
    const deleted = await listAction({
      request: formRequest(
        "http://localhost/employees",
        {
          intent: "delete",
          employeeId: "999999",
        },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    expect((await unwrap(deleted)).status).toBe(404);
  });
});
