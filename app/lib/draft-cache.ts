import { z } from "zod";

import type { EmployeeDraft } from "~/types";

const STORAGE_KEY = "peopleops:employee-drafts:v1";
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const draftSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  position: z.string(),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const cacheSchema = z.object({
  version: z.literal(CACHE_VERSION),
  savedAt: z.string(),
  drafts: z.array(draftSchema),
});

export type DraftCacheState = {
  drafts: EmployeeDraft[];
  savedAt: string | null;
  storageAvailable: boolean;
};

function emptyCache(
  storageAvailable: boolean,
): DraftCacheState {
  return {
    drafts: [],
    savedAt: null,
    storageAvailable,
  };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readDraftCache(): DraftCacheState {
  const storage = getStorage();

  if (!storage) {
    return emptyCache(false);
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return emptyCache(true);
    }

    let decoded: unknown;

    try {
      decoded = JSON.parse(raw);
    } catch {
      storage.removeItem(STORAGE_KEY);
      return emptyCache(true);
    }

    const parsed = cacheSchema.safeParse(decoded);

    if (!parsed.success) {
      storage.removeItem(STORAGE_KEY);
      return emptyCache(true);
    }

    const savedAtTime = new Date(
      parsed.data.savedAt,
    ).getTime();

    if (
      !Number.isFinite(savedAtTime) ||
      Date.now() - savedAtTime > CACHE_TTL_MS
    ) {
      storage.removeItem(STORAGE_KEY);
      return emptyCache(true);
    }

    return {
      drafts: parsed.data.drafts,
      savedAt: parsed.data.savedAt,
      storageAvailable: true,
    };
  } catch {
    return emptyCache(false);
  }
}

export function writeDraftCache(
  drafts: EmployeeDraft[],
): string | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const savedAt = new Date().toISOString();

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CACHE_VERSION,
        savedAt,
        drafts,
      }),
    );

    return savedAt;
  } catch {
    return null;
  }
}

export function clearDraftCache(): boolean {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
