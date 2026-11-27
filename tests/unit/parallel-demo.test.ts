import { describe, expect, it } from "vitest";

import {
  runParallelDemo,
  type ParallelApiSpec,
} from "~/lib/parallel-demo.server";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function specs(): ParallelApiSpec[] {
  return ["posts", "comments", "albums", "photos", "todos"].map(
    (key, index) => ({
      key,
      label: key,
      url: `https://example.test/${key}`,
      delayMs: 0,
      sampleField: "title",
    }),
  );
}

function payload() {
  return Array.from({ length: 100 }, (_, index) => ({
    id: index,
    title: `Item ${index}`,
  }));
}

describe("parallel demo", () => {
  it("loads five APIs concurrently", async () => {
    const delays = [50, 60, 40, 80, 20];

    const result = await runParallelDemo({
      specs: specs(),
      sleep: async () => undefined,
      fetcher: async (url) => {
        const index = specs().findIndex(
          (spec) => spec.url === url,
        );
        await sleep(delays[index]);
        return Response.json(payload());
      },
    });

    expect(result.results).toHaveLength(5);
    expect(result.totalRecords).toBe(500);
    expect(result.totalDurationMs).toBeLessThan(
      result.sequentialDurationMs,
    );
    expect(result.savedMs).toBeGreaterThan(0);
  });

  it("keeps other results when one API fails", async () => {
    const result = await runParallelDemo({
      specs: specs(),
      sleep: async () => undefined,
      fetcher: async (url) => {
        if (url.endsWith("/photos")) {
          throw new Error("network");
        }

        return Response.json(payload());
      },
    });

    const failed = result.results.find(
      (item) => item.key === "photos",
    );

    expect(failed?.ok).toBe(false);
    expect(failed?.error).toContain("network");
    expect(result.totalRecords).toBe(400);
  });
});
