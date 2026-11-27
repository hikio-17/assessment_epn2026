import {
  NavLink,
  Outlet,
  useLoaderData,
} from "react-router";
import {
  Activity,
  ClipboardList,
  FileText,
  LayoutDashboard,
  NotebookPen,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Route } from "./+types/app-layout";
import { TopLoadingBar } from "~/components/top-loading-bar";
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

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const operationalItems: NavItem[] = [
  {
    to: "/",
    label: "Dasbor",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/employees",
    label: "Karyawan",
    icon: Users,
  },
  {
    to: "/assignments",
    label: "Penugasan",
    icon: ClipboardList,
  },
  {
    to: "/drafts",
    label: "Draf",
    icon: NotebookPen,
  },
];

const reportItems: NavItem[] = [
  {
    to: "/reports",
    label: "Karyawan & payroll",
    icon: FileText,
  },
];

const systemItems: NavItem[] = [
  {
    to: "/concurrency",
    label: "Concurrency API",
    icon: Activity,
  },
];

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  const isAdmin = user.role === "ADMIN";

  const navGroups = [
    {
      label: "Operasional",
      items: operationalItems,
    },
    {
      label: "Laporan",
      items: reportItems,
    },
    {
      label: "Sistem",
      items: isAdmin
        ? [
            ...systemItems,
            {
              to: "/admin/users",
              label: "Pengguna",
              icon: ShieldCheck,
            },
          ]
        : systemItems,
    },
  ];

  const mobileItems = navGroups.flatMap(
    (group) => group.items,
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">PeopleOps</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              HR Workspace
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map(
                  ({ to, label, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </NavLink>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-5 sm:px-8">
            <div className="lg:hidden">
              <p className="text-sm font-semibold">
                PeopleOps
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Workspace
              </p>
            </div>

            <UserMenu user={user} />
          </div>

          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
            {mobileItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <TopLoadingBar />
        </header>

        <main className="mx-auto px-5 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
