export const USER_ROLES = ["ADMIN", "HR", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  HR: "HR Staff",
  VIEWER: "Viewer",
};

export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const ASSIGNMENT_STATUSES = ["ACTIVE", "COMPLETED"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
};