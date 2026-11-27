import {
  useLoaderData,
  useRevalidator,
} from "react-router";
import {
  Activity,
  RefreshCw,
  Timer,
  Zap,
} from "lucide-react";

import type { Route } from "./+types/parallel-fetch";
import { PageHeader } from "~/components/page-header";
import { requireAuthenticatedUser } from "~/authorization.server";
import { runParallelDemo } from "~/lib/parallel-demo.server";

export async function loader({
  context,
}: Route.LoaderArgs) {
  requireAuthenticatedUser(context);

  return runParallelDemo();
}

export function meta() {
  return [{ title: "Parallel API Lab - PeopleOps" }];
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

const accents: Record<string, string> = {
  posts: "bg-indigo-500",
  comments: "bg-sky-500",
  albums: "bg-emerald-500",
  photos: "bg-amber-500",
  todos: "bg-rose-500",
};

export default function ParallelFetchPage() {
  const data = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const running = revalidator.state === "loading";

  const comparisonMax = Math.max(
    data.sequentialDurationMs,
    data.totalDurationMs,
    1,
  );

  const metrics = [
    {
      label: "Parallel total",
      value: formatSeconds(data.totalDurationMs),
      hint: "Waktu yang benar-benar dirasakan",
      icon: Timer,
    },
    {
      label: "Sequential estimate",
      value: formatSeconds(data.sequentialDurationMs),
      hint: "Jika kelima API dijalankan berurutan",
      icon: Activity,
    },
    {
      label: "Time saved",
      value: formatSeconds(data.savedMs),
      hint: "Selisih sequential vs parallel",
      icon: Zap,
    },
    {
      label: "Records loaded",
      value: data.totalRecords.toLocaleString("id-ID"),
      hint: "5 API × 100 data",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "API Lab" },
        ]}
        title="5 APIs. One wait."
        description="Kelima request dijalankan dengan Promise.all di server loader. Total waktu harus mendekati API paling lambat, bukan jumlah semua delay."
        actions={
          <button
            type="button"
            onClick={() => revalidator.revalidate()}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                running ? "animate-spin" : ""
              }`}
            />
            {running ? "Running..." : "Run again"}
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                {label}
              </p>
              <Icon className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Sequential vs parallel
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Batang merah adalah estimasi jika request
              dijalankan satu per satu. Batang indigo adalah
              hasil aktual.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Sum of individual durations:{" "}
            {formatSeconds(data.sequentialDurationMs)}
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-rose-600">
                Sequential estimate
              </span>
              <span className="font-medium text-slate-600">
                {formatSeconds(data.sequentialDurationMs)}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-rose-400"
                style={{
                  width: `${
                    (data.sequentialDurationMs /
                      comparisonMax) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-indigo-700">
                Parallel actual
              </span>
              <span className="font-medium text-slate-600">
                {formatSeconds(data.totalDurationMs)}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${
                    (data.totalDurationMs /
                      comparisonMax) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.results.map((result) => (
          <article
            key={result.key}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  {result.label}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Delay +{result.delayMs}ms
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  result.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {result.ok ? `${result.status} OK` : "ERROR"}
              </span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {formatSeconds(result.durationMs)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {result.count} records
                </p>
              </div>

              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    accents[result.key] ?? "bg-slate-500"
                  }`}
                  style={{
                    width: `${
                      (result.durationMs /
                        Math.max(
                          ...data.results.map(
                            (item) => item.durationMs,
                          ),
                          1,
                        )) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {result.ok ? (
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {result.sample.map((item) => (
                  <li key={item} className="truncate">
                    • {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {result.error}
              </p>
            )}
          </article>
        ))}
      </section>

      <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-5 py-4 text-xs leading-5 text-slate-500">
        Data berasal dari JSONPlaceholder. Jika jaringan eksternal
        sedang bermasalah, kartu API akan menampilkan error, tetapi
        pengukuran parallel tetap berjalan dan halaman tidak
        melakukan fetch dari client.
      </p>
    </div>
  );
}