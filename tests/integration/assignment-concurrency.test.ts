import { beforeEach, describe, expect, it } from "vitest";

import { AssignmentEntity } from "~/db/entities";
import { ConflictError } from "~/lib/errors";
import {
  createAssignment,
  updateAssignment,
} from "~/services/assignment.server";
import {
  getTestDataSource,
  useTestDatabase,
} from "../helpers/database";
import { seedBaseData } from "../fixtures";

describe("assignment concurrency", () => {
  useTestDatabase();

  let data: Awaited<ReturnType<typeof seedBaseData>>;

  beforeEach(async () => {
    data = await seedBaseData();
  });

  it("allows only one concurrent active assignment per employee", async () => {
    const input = {
      title: "Race assignment",
      departmentId: data.departments.it.id,
      employeeId: data.employees.siti.id,
      status: "ACTIVE" as const,
    };

    const results = await Promise.allSettled([
      createAssignment(input),
      createAssignment(input),
      createAssignment(input),
    ]);

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result) => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    for (const result of rejected) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(
          ConflictError,
        );
        expect(result.reason.status).toBe(409);
      }
    }

    const dataSource = await getTestDataSource();
    const activeCount = await dataSource
      .getRepository(AssignmentEntity)
      .countBy({
        employeeId: data.employees.siti.id,
        status: "ACTIVE",
      });

    expect(activeCount).toBe(1);
  });

  it("rejects stale concurrent updates", async () => {
    const created = await createAssignment({
      title: "Version test",
      departmentId: data.departments.it.id,
      employeeId: data.employees.siti.id,
      status: "ACTIVE",
    });

    const updateInput = {
      title: "Version update",
      departmentId: data.departments.it.id,
      employeeId: data.employees.siti.id,
      status: "ACTIVE" as const,
      version: created.version,
    };

    const results = await Promise.allSettled([
      updateAssignment(created.id, updateInput),
      updateAssignment(created.id, updateInput),
      updateAssignment(created.id, updateInput),
    ]);

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result) => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    const dataSource = await getTestDataSource();
    const stored = await dataSource
      .getRepository(AssignmentEntity)
      .findOneByOrFail({ id: created.id });

    expect(stored.version).toBe(2);
    expect(stored.title).toBe("Version update");
  });

  it("has the partial unique index in postgres", async () => {
    const dataSource = await getTestDataSource();
    const indexes = await dataSource.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE tablename = 'assignments'`,
    );

    expect(
      indexes.some(
        (index: { indexname: string }) =>
          index.indexname ===
          "uq_assignments_active_employee",
      ),
    ).toBe(true);
  });
});
