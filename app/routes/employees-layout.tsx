import { Outlet } from "react-router";

import { requireRoleForWriteMiddleware } from "~/middleware/auth.server";

export const middleware = [
  requireRoleForWriteMiddleware(["ADMIN", "HR"]),
];

export default function EmployeesLayout() {
  return <Outlet />;
}
