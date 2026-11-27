// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  clearDraftCache,
  readDraftCache,
  writeDraftCache,
} from "~/lib/draft-cache";
import type { EmployeeDraft } from "~/types";

const STORAGE_KEY = "peopleops:employee-drafts:v1";

const draft: EmployeeDraft = {
  id: "draft-1",
  name: "Draft One",
  email: "draft@test.local",
  position: "Engineer",
  note: "note",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("draft cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads empty cache", () => {
    expect(readDraftCache()).toEqual({
      drafts: [],
      savedAt: null,
      storageAvailable: true,
    });
  });

  it("writes and reads drafts", () => {
    const savedAt = writeDraftCache([draft]);
    const result = readDraftCache();

    expect(savedAt).toBeTruthy();
    expect(result.drafts).toEqual([draft]);
    expect(result.savedAt).toBe(savedAt);
  });

  it("handles corrupt json", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");

    expect(readDraftCache().drafts).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("handles wrong cache version", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 99,
        savedAt: new Date().toISOString(),
        drafts: [draft],
      }),
    );

    expect(readDraftCache().drafts).toEqual([]);
  });

  it("expires old cache entries", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: "2020-01-01T00:00:00.000Z",
        drafts: [draft],
      }),
    );

    expect(readDraftCache().drafts).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clears cache", () => {
    writeDraftCache([draft]);

    expect(clearDraftCache()).toBe(true);
    expect(readDraftCache().drafts).toEqual([]);
  });
});
