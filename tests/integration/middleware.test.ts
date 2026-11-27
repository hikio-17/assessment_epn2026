import { beforeEach, describe, expect, it } from "vitest";

import { authUserContext } from "~/context.server";
import {
  requireApiAuthMiddleware,
  requireApiWriteRoleMiddleware,
  requireAuthMiddleware,
  requireRoleForWriteMiddleware,
  requireRoleMiddleware,
  sessionHydrationMiddleware,
} from "~/middleware/auth.server";
import { getRequest } from "../helpers/request";
import { createContext } from "../helpers/context";
import { useTestDatabase } from "../helpers/database";
import {
  middlewareArgs,
  runMiddlewareChain,
} from "../helpers/middleware";
import { sessionCookieFor } from "../helpers/session";
import { seedBaseData } from "../fixtures";

describe("middleware", () => {
  useTestDatabase();

  let data: Awaited<ReturnType<typeof seedBaseData>>;

  beforeEach(async () => {
    data = await seedBaseData();
  });

  it("hydrates user from session cookie", async () => {
    const cookie = await sessionCookieFor(data.admin.id);
    const context = createContext();
    const request = getRequest(
      "http://localhost/",
      cookie,
    );

    const response = await runMiddlewareChain(
      [
        sessionHydrationMiddleware,
        requireAuthMiddleware,
      ],
      middlewareArgs(request, context),
    );

    expect(response.status).toBe(200);
    expect(context.get(authUserContext)?.id).toBe(
      data.admin.id,
    );
  });

  it("redirects when no session exists", async () => {
    const context = createContext();
    const request = getRequest("http://localhost/employees");

    await expect(
      runMiddlewareChain(
        [
          sessionHydrationMiddleware,
          requireAuthMiddleware,
        ],
        middlewareArgs(request, context),
      ),
    ).rejects.toMatchObject({
      status: 302,
    });
  });

  it("rejects viewer from admin route", async () => {
    const cookie = await sessionCookieFor(
      data.viewer.id,
    );
    const context = createContext();
    const request = getRequest(
      "http://localhost/admin/users",
      cookie,
    );

    await expect(
      runMiddlewareChain(
        [
          sessionHydrationMiddleware,
          requireRoleMiddleware(["ADMIN"]),
        ],
        middlewareArgs(request, context),
      ),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it("returns 401 from API auth without user", async () => {
    const context = createContext();
    const request = getRequest(
      "http://localhost/api/assignments",
    );

    const response = await runMiddlewareChain(
      [requireApiAuthMiddleware],
      middlewareArgs(request, context),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for viewer API write", async () => {
    const context = createContext(data.viewer);
    const request = new Request(
      "http://localhost/api/assignments",
      { method: "POST" },
    );

    const response = await runMiddlewareChain(
      [
        requireApiAuthMiddleware,
        requireApiWriteRoleMiddleware([
          "ADMIN",
          "HR",
        ]),
      ],
      middlewareArgs(request, context),
    );

    expect(response.status).toBe(403);
  });

  it("allows admin API write", async () => {
    const context = createContext(data.admin);
    const request = new Request(
      "http://localhost/api/assignments",
      { method: "POST" },
    );

    const response = await runMiddlewareChain(
      [
        requireApiAuthMiddleware,
        requireApiWriteRoleMiddleware([
          "ADMIN",
          "HR",
        ]),
      ],
      middlewareArgs(request, context),
    );

    expect(response.status).toBe(200);
  });

  it("allows viewer page GET but blocks page write", async () => {
    const context = createContext(data.viewer);
    const getResponse = await runMiddlewareChain(
      [requireRoleForWriteMiddleware(["ADMIN", "HR"])],
      middlewareArgs(
        new Request("http://localhost/employees"),
        context,
      ),
    );

    expect(getResponse.status).toBe(200);

    await expect(
      runMiddlewareChain(
        [requireRoleForWriteMiddleware(["ADMIN", "HR"])],
        middlewareArgs(
          new Request("http://localhost/employees", {
            method: "POST",
          }),
          context,
        ),
      ),
    ).rejects.toMatchObject({
      status: 403,
    });
  });
});
