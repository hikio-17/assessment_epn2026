import { describe, expect, it } from "vitest";

import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
  employeeDraftSchema,
  employeeInputSchema,
  loginSchema,
  toFieldErrors,
  userCreateFormSchema,
} from "~/lib/validation";

describe("validation schemas", () => {
  it("rejects empty login fields", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed login email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "x",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      email: " ADMIN@Test.Local ",
      password: "x",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@test.local");
    }
  });

  it("rejects empty user fields", () => {
    const result = userCreateFormSchema.safeParse({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "VIEWER",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      expect(errors.name).toBeDefined();
      expect(errors.email).toBeDefined();
      expect(errors.password).toBeDefined();
      expect(errors.confirmPassword).toBeDefined();
    }
  });

  it("rejects mismatched password confirmation", () => {
    const result = userCreateFormSchema.safeParse({
      name: "Nadia Putri",
      email: "nadia@test.local",
      password: "Password123!",
      confirmPassword: "Password456!",
      role: "HR",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        toFieldErrors(result.error).confirmPassword,
      ).toBe("Konfirmasi kata sandi tidak sama.");
    }
  });

  it("rejects short user passwords", () => {
    const result = userCreateFormSchema.safeParse({
      name: "Nadia Putri",
      email: "nadia@test.local",
      password: "short",
      confirmPassword: "short",
      role: "HR",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid user input and lowercases email", () => {
    const result = userCreateFormSchema.safeParse({
      name: "Nadia Putri",
      email: " NADIA@Test.Local ",
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "HR",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("nadia@test.local");
    }
  });

  it("rejects empty employee fields", () => {
    const result = employeeInputSchema.safeParse({
      name: "",
      email: "",
      position: "",
      departmentId: "",
      salary: "",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
    expect(
      Object.keys(toFieldErrors(result.error!)),
    ).toEqual(
      expect.arrayContaining([
        "name",
        "email",
        "position",
        "departmentId",
        "salary",
      ]),
    );
  });

  it("rejects invalid employee email and salary", () => {
    const result = employeeInputSchema.safeParse({
      name: "Angga",
      email: "broken",
      position: "Engineer",
      departmentId: "1",
      salary: "-5",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      expect(errors.email).toBeDefined();
      expect(errors.salary).toBeDefined();
    }
  });

  it("accepts valid employee input", () => {
    const result = employeeInputSchema.safeParse({
      name: "Angga",
      email: "ANGGA@test.local",
      position: "Engineer",
      departmentId: "2",
      salary: "1000",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.departmentId).toBe(2);
      expect(result.data.salary).toBe(1000);
      expect(result.data.email).toBe("angga@test.local");
    }
  });

  it("rejects invalid assignment input", () => {
    const result = assignmentCreateSchema.safeParse({
      title: "",
      departmentId: 0,
      employeeId: 0,
      status: "BAD",
    });

    expect(result.success).toBe(false);
  });

  it("requires version for assignment update", () => {
    const result = assignmentUpdateSchema.safeParse({
      title: "Laptop",
      departmentId: 1,
      employeeId: 1,
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
  });

  it("validates draft input", () => {
    expect(
      employeeDraftSchema.safeParse({
        name: "A",
        email: "bad",
        position: "E",
        note: "x".repeat(301),
      }).success,
    ).toBe(false);

    expect(
      employeeDraftSchema.safeParse({
        name: "Angga",
        email: "angga@test.local",
        position: "Engineer",
        note: "ok",
      }).success,
    ).toBe(true);
  });
});
