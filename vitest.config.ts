import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const appDir = fileURLToPath(
  new URL("./app", import.meta.url),
);

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://assessment:assessment@localhost:5432/assessment_test";

export default defineConfig({
  resolve: {
    alias: {
      "~": appDir,
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    restoreMocks: true,
    clearMocks: true,
    env: {
      DATABASE_URL: testDatabaseUrl,
      SESSION_SECRET: "test-session-secret",
      COOKIE_SECURE: "false",
      UPLOAD_DIR: fileURLToPath(
        new URL("./tests/.tmp/uploads", import.meta.url),
      ),
    },
  },
});
