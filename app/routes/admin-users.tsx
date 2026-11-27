import { useLoaderData } from "react-router";

import type { Route } from "./+types/admin-users";
import { PageHeader } from "~/components/page-header";
import { requirePageRole } from "~/authorization.server";
import {
  UserEntity,
  type User,
} from "~/db/entities";
import { getInitializedDataSource } from "~/db.server";
import {
  ROLE_LABELS,
  type UserRole,
} from "~/lib/constants";
import { requireRoleMiddleware } from "~/middleware/auth.server";

export const middleware = [
  requireRoleMiddleware(["ADMIN"]),
];

export async function loader({
  context,
}: Route.LoaderArgs) {
  requirePageRole(context, ["ADMIN"]);

  const dataSource = await getInitializedDataSource();

  const users = await dataSource
    .getRepository<User>(UserEntity)
    .find({
      order: { id: "ASC" },
    });

  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    })),
  };
}

export function meta() {
  return [{ title: "Admin users - PeopleOps" }];
}

const roleStyles: Record<UserRole, string> = {
  ADMIN: "border-violet-200 bg-violet-50 text-violet-700",
  HR: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VIEWER: "border-slate-200 bg-slate-50 text-slate-600",
};

export default function AdminUsersPage() {
  const { users } = useLoaderData<typeof loader>();
  const adminCount = users.filter(
    (user) => user.role === "ADMIN",
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Admin" },
          { label: "Users" },
        ]}
        title="Admin users"
        description="Halaman ini hanya bisa dibuka oleh role ADMIN. Middleware route-level menolak HR dan VIEWER sebelum loader dijalankan."
        actions={
          <>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xs text-slate-500">Total users</p>
              <p className="mt-1 text-xl font-bold">
                {users.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xs text-slate-500">Admins</p>
              <p className="mt-1 text-xl font-bold">
                {adminCount}
              </p>
            </div>
          </>
        }
      />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold">
            Registered users
          </h2>
          <span className="text-xs text-slate-400">
            Password hash tidak pernah dikirim ke client
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">
                  Name
                </th>
                <th className="px-6 py-3 font-semibold">
                  Email
                </th>
                <th className="px-6 py-3 font-semibold">
                  Role
                </th>
                <th className="px-6 py-3 font-semibold">
                  Created
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/70"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${roleStyles[user.role]}`}
                    >
                      {user.role} · {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {user.createdAt.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}