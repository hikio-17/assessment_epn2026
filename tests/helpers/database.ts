import {
  afterAll,
  beforeEach,
} from "vitest";

import {
  closeDataSource,
  getInitializedDataSource,
} from "~/db.server";

export function useTestDatabase() {
  beforeEach(async () => {
    const dataSource = await getInitializedDataSource();

    await dataSource.query(
      'TRUNCATE TABLE "assignments", "employees", "departments", "users" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await closeDataSource();
  });
}

export async function getTestDataSource() {
  return getInitializedDataSource();
}
