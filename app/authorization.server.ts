import { redirect, type RouterContextProvider } from "react-router";

import { authUserContext } from "./context.server";
import type { UserRole } from "./lib/constants";
import type { AuthUser } from "./types";
import {
  ForbiddenError,
  UnauthorizedError,
} from "./lib/errors";

type AppContext = Readonly<RouterContextProvider>;

export function hasRole(
  user: AuthUser,
  roles: readonly UserRole[],
): boolean {
  return roles.includes(user.role);
}

export function getOptionalUser(
  context: AppContext,
): AuthUser | null {
  return context.get(authUserContext);
}

export function requireAuthenticatedUser(
  context: AppContext,
): AuthUser {
  const user = getOptionalUser(context);

  if (!user) {
    throw redirect("/login");
  }

  return user;
}

export function requireRole(
  user: AuthUser,
  roles: readonly UserRole[],
): void {
  if (!hasRole(user, roles)) {
    throw new Response("Forbidden", {
      status: 403,
      statusText: "Forbidden",
    });
  }
}

export function requirePageRole(
  context: AppContext,
  roles: readonly UserRole[],
): AuthUser {
  const user = requireAuthenticatedUser(context);
  requireRole(user, roles);
  return user;
}

export function requireApiUser(
  context: AppContext,
): AuthUser {
  const user = getOptionalUser(context);

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export function requireApiRole(
  context: AppContext,
  roles: readonly UserRole[],
): AuthUser {
  const user = requireApiUser(context);

  if (!hasRole(user, roles)) {
    throw new ForbiddenError();
  }

  return user;
}