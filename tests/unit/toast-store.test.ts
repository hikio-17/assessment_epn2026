import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dismissToast,
  getToasts,
  pushToast,
  resetToasts,
} from "~/lib/toast-store";

describe("toast store", () => {
  beforeEach(() => {
    resetToasts();
  });

  afterEach(() => {
    resetToasts();
    vi.useRealTimers();
  });

  it("deduplicates toast with same id", () => {
    pushToast({
      id: "same-id",
      variant: "success",
      title: "Saved",
    });
    pushToast({
      id: "same-id",
      variant: "error",
      title: "Duplicate",
    });

    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0].title).toBe("Saved");
  });

  it("keeps at most four toasts", () => {
    for (let index = 0; index < 6; index++) {
      pushToast({
        id: `toast-${index}`,
        variant: "info",
        title: `Toast ${index}`,
      });
    }

    expect(getToasts()).toHaveLength(4);
  });

  it("dismisses a toast", () => {
    pushToast({
      id: "dismiss-me",
      variant: "error",
      title: "Error",
    });

    dismissToast("dismiss-me");

    expect(getToasts()).toHaveLength(0);
  });

  it("auto dismisses after duration", () => {
    vi.useFakeTimers();

    pushToast({
      id: "timer",
      variant: "success",
      title: "Timed",
      duration: 1000,
    });

    vi.advanceTimersByTime(1000);

    expect(getToasts()).toHaveLength(0);
  });
});
