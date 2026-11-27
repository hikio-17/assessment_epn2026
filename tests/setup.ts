import "dotenv/config";

import path from "node:path";
import os from "node:os";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://assessment:assessment@localhost:5432/assessment_test";

process.env.DATABASE_URL = testDatabaseUrl;
process.env.SESSION_SECRET = "test-session-secret";
process.env.COOKIE_SECURE = "false";
process.env.UPLOAD_DIR =
  process.env.UPLOAD_DIR ??
  path.join(os.tmpdir(), "peopleops-test-uploads");
