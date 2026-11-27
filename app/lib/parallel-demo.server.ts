export type ParallelApiSpec = {
  key: string;
  label: string;
  url: string;
  delayMs: number;
  sampleField: string;
};

export type ParallelApiResult = {
  key: string;
  label: string;
  delayMs: number;
  ok: boolean;
  status: number;
  durationMs: number;
  count: number;
  sample: string[];
  error?: string;
};

export type ParallelDemoResult = {
  results: ParallelApiResult[];
  totalDurationMs: number;
  sequentialDurationMs: number;
  savedMs: number;
  totalRecords: number;
  startedAt: string;
  finishedAt: string;
};

const JSON_PLACEHOLDER =
  "https://jsonplaceholder.typicode.com";

export const PARALLEL_API_SPECS: ParallelApiSpec[] = [
  {
    key: "posts",
    label: "Posts",
    url: `${JSON_PLACEHOLDER}/posts?_limit=100`,
    delayMs: 1000,
    sampleField: "title",
  },
  {
    key: "comments",
    label: "Comments",
    url: `${JSON_PLACEHOLDER}/comments?_limit=100`,
    delayMs: 1200,
    sampleField: "name",
  },
  {
    key: "albums",
    label: "Albums",
    url: `${JSON_PLACEHOLDER}/albums?_limit=100`,
    delayMs: 800,
    sampleField: "title",
  },
  {
    key: "photos",
    label: "Photos",
    url: `${JSON_PLACEHOLDER}/photos?_limit=100`,
    delayMs: 2000,
    sampleField: "title",
  },
  {
    key: "todos",
    label: "Todos",
    url: `${JSON_PLACEHOLDER}/todos?_limit=100`,
    delayMs: 500,
    sampleField: "title",
  },
];

type DemoFetcher = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

type DemoSleep = (ms: number) => Promise<void>;

type RunParallelDemoOptions = {
  fetcher?: DemoFetcher;
  sleep?: DemoSleep;
  specs?: ParallelApiSpec[];
};

export async function runParallelDemo(
  options: RunParallelDemoOptions = {},
): Promise<ParallelDemoResult> {
  const fetcher =
    options.fetcher ??
    ((url, init) => fetch(url, init));

  const sleep =
    options.sleep ??
    ((ms) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));

  const specs = options.specs ?? PARALLEL_API_SPECS;

  const startedAt = new Date();
  const started = performance.now();


  // paraplel execution of API calls
  const results = await Promise.all(
    specs.map(async (spec): Promise<ParallelApiResult> => {
      const taskStarted = performance.now();

      try {
        if (spec.delayMs > 0) {
          await sleep(spec.delayMs);
        }

        const response = await fetcher(spec.url, {
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: unknown = await response.json();
        const items = Array.isArray(payload) ? payload : [];

        const sample = items
          .slice(0, 2)
          .map((item) => {
            if (
              item &&
              typeof item === "object" &&
              spec.sampleField in item
            ) {
              const value = (
                item as Record<string, unknown>
              )[spec.sampleField];

              return typeof value === "string"
                ? value
                : String(value ?? "");
            }

            return "";
          })
          .filter(Boolean);

        return {
          key: spec.key,
          label: spec.label,
          delayMs: spec.delayMs,
          ok: true,
          status: response.status,
          durationMs: Math.round(
            performance.now() - taskStarted,
          ),
          count: items.length,
          sample,
        };
      } catch (error) {
        return {
          key: spec.key,
          label: spec.label,
          delayMs: spec.delayMs,
          ok: false,
          status: 0,
          durationMs: Math.round(
            performance.now() - taskStarted,
          ),
          count: 0,
          sample: [],
          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
        };
      }
    }),
  );

  const totalDurationMs = Math.round(
    performance.now() - started,
  );

  const sequentialDurationMs = results.reduce(
    (sum, result) => sum + result.durationMs,
    0,
  );

  return {
    results,
    totalDurationMs,
    sequentialDurationMs,
    savedMs: Math.max(
      0,
      sequentialDurationMs - totalDurationMs,
    ),
    totalRecords: results.reduce(
      (sum, result) => sum + result.count,
      0,
    ),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };
}