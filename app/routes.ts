import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route(
    "uploads/:filename",
    "routes/upload-photo.ts",
  ),
  route(
    "reports/export",
    "routes/report-export.ts",
  ),
  route("reports", "routes/reports-layout.tsx", [
    index("routes/report-headcount.tsx"),
  ]),
  route(
    "api/departments",
    "routes/api.departments.ts",
  ),
  route(
    "api/departments/:departmentId/employees",
    "routes/api.department-employees.ts",
  ),
  route(
    "api/assignments",
    "routes/api.assignments.ts",
  ),
  route(
    "api/assignments/:id",
    "routes/api.assignment.ts",
  ),
  layout("routes/app-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("admin/users", "routes/admin-users.tsx"),
    route("employees", "routes/employees-layout.tsx", [
      index("routes/employees-list.tsx"),
      route("new", "routes/employee-new.tsx"),
      route(":id", "routes/employee-detail.tsx"),
      route(":id/edit", "routes/employee-edit.tsx"),
    ]),
    route("assignments", "routes/assignments.tsx"),
    route("drafts", "routes/drafts.tsx"),
    route("lab/parallel", "routes/parallel-fetch.tsx"),
  ]),
] satisfies RouteConfig;