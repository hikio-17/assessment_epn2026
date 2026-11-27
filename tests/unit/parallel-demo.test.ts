import { describe, expect, it } from "vitest";

import {
  runParallelDemo,
  type ParallelApiSpec,
} from "~/lib/parallel-demo.server";

type TestSource = ParallelApiSpec & {
  count: number;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const sources: TestSource[] = [
  {
    key: "employees",
    label: "Employees",
    url: "https://example.test/employees",
    delayMs: 120,
    count: 12,
  },
  {
    key: "departments",
    label: "Departments",
    url: "https://example.test/departments",
    delayMs: 180,
    count: 7,
  },
  {
    key: "payroll",
    label: "Payroll",
    url: "https://example.test/payroll",
    delayMs: 90,
    count: 20,
  },
  {
    key: "attendance",
    label: "Attendance",
    url: "https://example.test/attendance",
    delayMs: 240,
    count: 5,
  },
  {
    key: "reports",
    label: "Reports",
    url: "https://example.test/reports",
    delayMs: 60,
    count: 9,
  },
];

function payload(size: number) {
  return Array.from({ length: size }, (_, index) => ({
    id: index,
    title: `Item ${index}`,
  }));
}

function createFetcher() {
  return async (url: string) => {
    const source = sources.find(
      (item) => item.url === url,
    );

    if (!source) {
      throw new Error(`Unexpected URL: ${url}`);
    }

    await sleep(source.delayMs);

    return Response.json(
      payload(source.count),
    );
  };
}

describe("concurrent request runner", () => {
  it("starts every request before the first response resolves", async () => {
    let started = 0;
    let release!: () => void;

    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const pending = runParallelDemo({
      specs: sources,
      sleep: async () => undefined,
      fetcher: async () => {
        started += 1;

        if (started === sources.length) {
          release();
        }

        await gate;
        return Response.json(payload(1));
      },
    });

    const result = await pending;

    expect(started).toBe(sources.length);
    expect(result.results).toHaveLength(sources.length);
  });

  it("keeps result order when responses finish out of order", async () => {
    const result = await runParallelDemo({
      specs: sources,
      sleep: async () => undefined,
      fetcher: createFetcher(),
    });

    expect(result.results.map((item) => item.key)).toEqual(
      sources.map((item) => item.key),
    );
    expect(result.totalRecords).toBe(53);
    expect(result.configuredSequentialMs).toBe(690);
    expect(result.configuredParallelMs).toBe(240);
    expect(result.totalDurationMs).toBeLessThan(
      result.sequentialDurationMs,
    );
    expect(result.totalDurationMs).toBeLessThan(
      result.configuredSequentialMs,
    );
    expect(result.savedMs).toBeGreaterThan(0);
  });

  it("keeps successful results when one source fails", async () => {
    const result = await runParallelDemo({
      specs: sources,
      sleep: async () => undefined,
      fetcher: async (url) => {
        if (url.endsWith("/attendance")) {
          throw new Error("network");
        }

        return createFetcher()(url);
      },
    });

    const failed = result.results.find(
      (item) => item.key === "attendance",
    );

    expect(result.results).toHaveLength(sources.length);
    expect(failed?.ok).toBe(false);
    expect(failed?.error).toContain("network");
    expect(result.totalRecords).toBe(48);
  });
});
