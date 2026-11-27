import { describe, expect, it, vi } from "vitest";

import { retryOnSerializationFailure } from "~/lib/concurrency";
import {
  isSerializationFailure,
  isUniqueViolation,
  isForeignKeyViolation,
} from "~/lib/errors";

describe("concurrency helpers", () => {
  it("retries serialization failures", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({
        driverError: { code: "40001" },
      })
      .mockRejectedValueOnce({
        driverError: { code: "40P01" },
      })
      .mockResolvedValue("ok");

    const result = await retryOnSerializationFailure(
      operation,
      3,
    );

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("does not retry normal errors", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new Error("boom"));

    await expect(
      retryOnSerializationFailure(operation, 3),
    ).rejects.toThrow("boom");

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("detects postgres error codes", () => {
    expect(
      isSerializationFailure({
        driverError: { code: "40001" },
      }),
    ).toBe(true);
    expect(
      isUniqueViolation({
        driverError: { code: "23505" },
      }),
    ).toBe(true);
    expect(
      isForeignKeyViolation({
        driverError: { code: "23503" },
      }),
    ).toBe(true);
    expect(isUniqueViolation(new Error("x"))).toBe(
      false,
    );
  });
});
