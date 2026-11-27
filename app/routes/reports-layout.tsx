import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
} from "react-router";
import {
  Download,
  FileText,
} from "lucide-react";

import type { Route } from "./+types/reports-layout";
import { UserMenu } from "~/components/user-menu";
import { requireAuthenticatedUser } from "~/authorization.server";
import { requireAuthMiddleware } from "~/middleware/auth.server";

export const middleware = [requireAuthMiddleware];

export async function loader({
  context,
}: Route.LoaderArgs) {
  return {
    user: requireAuthenticatedUser(context),
  };
}

export default function ReportsLayout() {
  const { user } = useLoaderData<typeof loader>();

  const canExport =
    user.role === "ADMIN" || user.role === "HR";

  return (
    <div className="min-h-screen bg-[#f4efe6] text-stone-900 print:bg-white">
      <header className="border-b border-stone-200 bg-[#fbf8f1]/95 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-serif text-lg font-semibold">
              PeopleOps Reports
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
              Workforce analytics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Workspace
            </Link>

            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[220px_1fr] print:block print:max-w-none print:p-0">
        <aside className="print:hidden">
          <nav className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              Reports
            </p>

            <NavLink
              to="/reports"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`
              }
            >
              <FileText className="h-4 w-4" />
              Headcount & payroll
            </NavLink>

            {canExport ? (
              <a
                href="/reports/export"
                className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-100"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            ) : null}
          </nav>

          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 text-xs leading-5 text-stone-500 shadow-sm">
            <p className="font-semibold text-stone-700">
              Access control
            </p>
            <p className="mt-2">
              Report bisa dilihat semua user. Export CSV hanya
              untuk ADMIN dan HR.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-center text-[10px] uppercase tracking-[0.18em] text-stone-400 print:hidden">
        PeopleOps · Confidential workforce report
      </footer>
    </div>
  );
}