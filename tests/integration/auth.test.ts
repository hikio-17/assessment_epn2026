import { beforeEach, describe, expect, it } from "vitest";

import { action as apiAssignmentsAction } from "~/routes/api.assignments";
import { loader as adminUsersLoader } from "~/routes/admin-users";
import { action as employeesListAction } from "~/routes/employees-list";
import {
  action as loginAction,
  loader as loginLoader,
} from "~/routes/login";
import { action as logoutAction } from "~/routes/logout";
import { useTestDatabase } from "../helpers/database";
import { createContext } from "../helpers/context";
import {
  formRequest,
  jsonRequest,
} from "../helpers/request";
import { capture, unwrap } from "../helpers/unwrap";
import {
  seedBaseData,
  TEST_PASSWORD,
} from "../fixtures";

describe("authentication routes", () => {
  useTestDatabase();

  let data: Awaited<ReturnType<typeof seedBaseData>>;

  beforeEach(async () => {
    data = await seedBaseData();
  });

  it("logs in with valid credentials", async () => {
    const result = await loginAction({
      request: formRequest("http://localhost/login", {
        email: "admin@test.local",
        password: TEST_PASSWORD,
        redirectTo: "/employees",
      }),
      context: createContext(),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(302);
    expect(unwrapped.headers.get("Location")).toBe(
      "/employees",
    );
    expect(
      unwrapped.headers.get("Set-Cookie"),
    ).toContain("__peopleops_session");
  });

  it("extends the session cookie when remember me is checked", async () => {
    const result = await loginAction({
      request: formRequest("http://localhost/login", {
        email: "admin@test.local",
        password: TEST_PASSWORD,
        redirectTo: "/",
        remember: "on",
      }),
      context: createContext(),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(302);
    expect(
      unwrapped.headers.get("Set-Cookie"),
    ).toContain("Max-Age=2592000");
  });

  it("keeps the default session duration without remember me", async () => {
    const result = await loginAction({
      request: formRequest("http://localhost/login", {
        email: "admin@test.local",
        password: TEST_PASSWORD,
        redirectTo: "/",
      }),
      context: createContext(),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(302);
    expect(
      unwrapped.headers.get("Set-Cookie"),
    ).toContain("Max-Age=28800");
  });

  it("rejects invalid password", async () => {
    const result = await loginAction({
      request: formRequest("http://localhost/login", {
        email: "admin@test.local",
        password: "wrong-password",
        redirectTo: "/",
      }),
      context: createContext(),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(400);
    expect(unwrapped.data).toMatchObject({
      ok: false,
    });
  });

  it("rejects malformed login input", async () => {
    const result = await loginAction({
      request: formRequest("http://localhost/login", {
        email: "broken",
        password: "",
      }),
      context: createContext(),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(400);
    expect(
      (unwrapped.data as { fieldErrors: unknown })
        .fieldErrors,
    ).toBeTruthy();
  });

  it("redirects login loader when already signed in", async () => {
    const result = await loginLoader({
      request: new Request("http://localhost/login"),
      context: createContext(data.admin),
      params: {},
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
  });

  it("destroys session on logout", async () => {
    const result = await logoutAction({
      request: new Request(
        "http://localhost/logout",
        { method: "POST" },
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(302);
    expect(
      unwrapped.headers.get("Set-Cookie"),
    ).toContain("__peopleops_session");
  });

  it("blocks viewer from admin page loader", async () => {
    const { response } = await capture(
      adminUsersLoader({
        request: new Request(
          "http://localhost/admin/users",
        ),
        context: createContext(data.viewer),
        params: {},
      } as never),
    );

    expect(response?.status).toBe(403);
  });

  it("allows admin to read admin page loader", async () => {
    const result = await adminUsersLoader({
      request: new Request(
        "http://localhost/admin/users",
      ),
      context: createContext(data.admin),
      params: {},
    } as never);

    expect(result).toHaveProperty("users");
  });

  it("returns 403 when viewer deletes employee", async () => {
    const result = await employeesListAction({
      request: formRequest("http://localhost/employees", {
        intent: "delete",
        employeeId: String(data.employees.angga.id),
      }),
      context: createContext(data.viewer),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(403);
    expect(unwrapped.data).toMatchObject({
      ok: false,
    });
  });

  it("returns 403 when viewer creates assignment", async () => {
    const result = await apiAssignmentsAction({
      request: jsonRequest(
        "http://localhost/api/assignments",
        {
          title: "Forbidden",
          departmentId: data.departments.it.id,
          employeeId: data.employees.siti.id,
          status: "ACTIVE",
        },
      ),
      context: createContext(data.viewer),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(403);
  });
});
