import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";

import {
  AssignmentEntity,
  DepartmentEntity,
  EmployeeEntity,
  UserEntity,
} from "./db/entities";

const DEFAULT_DATABASE_URL =
  "postgresql://assessment:assessment@localhost:5432/assessment";

type BuildDataSourceOptions = {
  url?: string;
  synchronize?: boolean;
  logging?: boolean;
};

export function buildDataSource(
  options: BuildDataSourceOptions = {},
): DataSource {
  return new DataSource({
    type: "postgres",
    url:
      options.url ??
      process.env.DATABASE_URL ??
      DEFAULT_DATABASE_URL,
    entities: [
      UserEntity,
      DepartmentEntity,
      EmployeeEntity,
      AssignmentEntity,
    ],
    // App tidak melakukan synchronize otomatis.
    // Schema dibuat oleh seed script / test setup.
    synchronize: options.synchronize ?? false,
    logging: options.logging ?? false,
    extra: {
      max: 10,
    },
  });
}

const globalForDb = globalThis as typeof globalThis & {
  __peopleopsDataSource?: DataSource;
};

export function getDataSource(): DataSource {
  if (!globalForDb.__peopleopsDataSource) {
    globalForDb.__peopleopsDataSource = buildDataSource();
  }

  return globalForDb.__peopleopsDataSource;
}

let initialization: Promise<DataSource> | null = null;

export async function getInitializedDataSource(): Promise<DataSource> {
  const dataSource = getDataSource();

  if (dataSource.isInitialized) {
    return dataSource;
  }

  if (!initialization) {
    initialization = dataSource
      .initialize()
      .then(() => dataSource)
      .catch((error) => {
        initialization = null;
        throw error;
      });
  }

  return initialization;
}

export async function closeDataSource(): Promise<void> {
  const dataSource = globalForDb.__peopleopsDataSource;

  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }

  delete globalForDb.__peopleopsDataSource;
  initialization = null;
}