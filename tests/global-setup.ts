import "dotenv/config";

import { execFileSync } from "node:child_process";
import { Client } from "pg";

import { buildDataSource } from "../app/db.server";

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://assessment:assessment@localhost:5432/assessment_test";

function getTestDatabaseUrl() {
  return (
    process.env.TEST_DATABASE_URL ??
    DEFAULT_TEST_DATABASE_URL
  );
}

function startDatabase() {
  execFileSync(
    "docker",
    ["compose", "up", "-d", "db", "--wait"],
    { cwd: process.cwd(), stdio: "ignore" },
  );
}

async function ensureDatabase(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\//, ""),
  );
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  let client: Client;

  try {
    client = new Client({
      connectionString: adminUrl.toString(),
    });
    await client.connect();
  } catch {
    startDatabase();
    client = new Client({
      connectionString: adminUrl.toString(),
    });
    await client.connect();
  }

  try {
    const exists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );

    if (exists.rowCount === 0) {
      const escapedName = databaseName.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${escapedName}"`);
    }
  } finally {
    await client.end();
  }
}

export default async function globalSetup() {
  const databaseUrl = getTestDatabaseUrl();

  await ensureDatabase(databaseUrl);

  const dataSource = buildDataSource({
    url: databaseUrl,
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    await dataSource.query("DROP SCHEMA public CASCADE");
    await dataSource.query("CREATE SCHEMA public");
    await dataSource.synchronize();
  } finally {
    await dataSource.destroy();
  }

  return async () => {
    const cleanup = buildDataSource({
      url: databaseUrl,
      synchronize: false,
    });

    await cleanup.initialize();

    try {
      await cleanup.query("DROP SCHEMA public CASCADE");
      await cleanup.query("CREATE SCHEMA public");
    } finally {
      await cleanup.destroy();
    }
  };
}
