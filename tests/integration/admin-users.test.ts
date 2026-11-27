import { beforeEach, describe, expect, it } from "vitest";

import { verifyCredentials } from "~/auth.server";
import { action as adminUsersAction } from "~/routes/admin-users";
import { useTestDatabase } from "../helpers/database";
import { createContext } from "../helpers/context";
import { formRequest } from "../helpers/request";
import { capture, unwrap } from "../helpers/unwrap";
import { seedBaseData } from "../fixtures";

const NEW_PASSWORD = "NewPassword123!";

describe("admin user creation", () => {
  useTestDatabase();

  let data: Awaited<ReturnType<typeof seedBaseData>>;

  beforeEach(async () => {
    data = await seedBaseData();
  });

  function createRequest(
    overrides: Record<string, string> = {},
  ) {
    return formRequest("http://localhost/admin/users", {
      name: "Nadia Putri",
      email: "nadia@test.local",
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
      role: "HR",
      ...overrides,
    });
  }

  it("creates a user as admin and hashes the password", async () => {
    const result = await adminUsersAction({
      request: createRequest(),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(302);
    expect(unwrapped.headers.get("Location")).toBe(
      "/admin/users?created=1",
    );

    const created = await verifyCredentials(
      "nadia@test.local",
      NEW_PASSWORD,
    );

    expect(created).toMatchObject({
      name: "Nadia Putri",
      email: "nadia@test.local",
      role: "HR",
    });
  });

  it("rejects mismatched password confirmation", async () => {
    const result = await adminUsersAction({
      request: createRequest({
        confirmPassword: "Different123!",
      }),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(400);
    expect(
      (unwrapped.data as {
        fieldErrors: Record<string, string>;
      }).fieldErrors.confirmPassword,
    ).toBe("Konfirmasi kata sandi tidak sama.");
    expect(
      await verifyCredentials(
        "nadia@test.local",
        NEW_PASSWORD,
      ),
    ).toBeNull();
  });

  it("rejects duplicate email", async () => {
    await adminUsersAction({
      request: createRequest(),
      context: createContext(data.admin),
      params: {},
    } as never);

    const result = await adminUsersAction({
      request: createRequest({
        email: "NADIA@test.local",
      }),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(400);
    expect(
      (unwrapped.data as {
        fieldErrors: Record<string, string>;
      }).fieldErrors.email,
    ).toBe("Email sudah digunakan.");
  });

  it("blocks non-admin from creating a user", async () => {
    const { response } = await capture(
      adminUsersAction({
        request: createRequest(),
        context: createContext(data.hr),
        params: {},
      } as never),
    );

    expect(response?.status).toBe(403);
    expect(
      await verifyCredentials(
        "nadia@test.local",
        NEW_PASSWORD,
      ),
    ).toBeNull();
  });
});
