import { describe, expect, it } from "vitest";

import {
  hasRole,
  requireApiRole,
  requireRole,
} from "~/authorization.server";
import {
  ForbiddenError,
  UnauthorizedError,
} from "~/lib/errors";
import type { AuthUser } from "~/types";
import { createContext } from "../helpers/context";

const admin: AuthUser = {
  id: 1,
  name: "Admin",
  email: "admin@test.local",
  role: "ADMIN",
};
const viewer: AuthUser = {
  id: 2,
  name: "Viewer",
  email: "viewer@test.local",
  role: "VIEWER",
};

describe("authorization", () => {
  it("checks roles", () => {
    expect(hasRole(admin, ["ADMIN"])).toBe(true);
    expect(hasRole(viewer, ["ADMIN", "HR"])).toBe(false);
  });

  it("throws 403 for page role failure", () => {
    expect(() =>
      requireRole(viewer, ["ADMIN"]),
    ).toThrow(Response);
  });

  it("throws unauthorized for API without user", () => {
    expect(() =>
      requireApiRole(createContext(), ["ADMIN"]),
    ).toThrow(UnauthorizedError);
  });

  it("throws forbidden for API viewer", () => {
    expect(() =>
      requireApiRole(
        createContext(viewer),
        ["ADMIN", "HR"],
      ),
    ).toThrow(ForbiddenError);
  });
});
