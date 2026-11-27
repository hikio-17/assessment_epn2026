import {
  redirect,
  type MiddlewareFunction,
} from "react-router";

import { getUserById } from "../auth.server";
import { hasRole } from "../authorization.server";
import {
  authUserContext,
  sessionContext,
} from "../context.server";
import type { UserRole } from "../lib/constants";
import { getSession } from "../session.server";

export const requestLoggerMiddleware: MiddlewareFunction =
  async ({ request, url }, next) => {
    const startedAt = performance.now();
    const response = await next();
    const duration = Math.round(
      performance.now() - startedAt,
    );
    const status =
      response instanceof Response ? response.status : 200;

    console.log(
      `${request.method} ${url.pathname} -> ${status} (${duration}ms)`,
    );

    return response;
  };

export const securityHeadersMiddleware: MiddlewareFunction =
  async (_args, next) => {
    const response = await next();

    if (response instanceof Response) {
      response.headers.set(
        "X-Content-Type-Options",
        "nosniff",
      );
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );
      response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
      );
    }

    return response;
  };

export const sessionHydrationMiddleware: MiddlewareFunction =
  async ({ request, context }, next) => {
    const session = await getSession(
      request.headers.get("Cookie"),
    );

    context.set(sessionContext, session);

    const userId = session.get("userId");
    const user =
      typeof userId === "number"
        ? await getUserById(userId)
        : null;

    context.set(authUserContext, user);

    return next();
  };

export const rootMiddleware: MiddlewareFunction[] = [
  requestLoggerMiddleware,
  securityHeadersMiddleware,
  sessionHydrationMiddleware,
];

export const requireAuthMiddleware: MiddlewareFunction =
  async ({ request, url, context }, next) => {
    const user = context.get(authUserContext);

    if (!user) {
      const redirectTo = `${url.pathname}${url.search}`;
      throw redirect(
        `/login?redirectTo=${encodeURIComponent(redirectTo)}`,
      );
    }

    return next();
  };

export function requireRoleMiddleware(
  roles: readonly UserRole[],
): MiddlewareFunction {
  return async ({ context }, next) => {
    const user = context.get(authUserContext);

    if (!user) {
      throw redirect("/login");
    }

    if (!hasRole(user, roles)) {
      throw new Response("Forbidden", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    return next();
  };
}

export function requireRoleForWriteMiddleware(
  roles: readonly UserRole[],
): MiddlewareFunction {
  return async ({ request, context }, next) => {
    if (request.method === "GET") {
      return next();
    }

    const user = context.get(authUserContext);

    if (!user) {
      throw redirect("/login");
    }

    if (!hasRole(user, roles)) {
      throw new Response("Forbidden", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    return next();
  };
}

export function requireApiWriteRoleMiddleware(
  roles: readonly UserRole[],
): MiddlewareFunction {
  return async ({ request, context }, next) => {
    if (
      request.method === "GET" ||
      request.method === "HEAD"
    ) {
      return next();
    }

    const user = context.get(authUserContext);

    if (!user) {
      return Response.json(
        {
          ok: false,
          message: "Unauthorized",
          fieldErrors: {},
        },
        { status: 401 },
      );
    }

    if (!hasRole(user, roles)) {
      return Response.json(
        {
          ok: false,
          message: "Forbidden",
          fieldErrors: {},
        },
        { status: 403 },
      );
    }

    return next();
  };
}

export const requireApiAuthMiddleware: MiddlewareFunction =
  async ({ context }, next) => {
    const user = context.get(authUserContext);

    if (!user) {
      return Response.json(
        {
          ok: false,
          message: "Unauthorized",
          fieldErrors: {},
        },
        { status: 401 },
      );
    }

    return next();
  };