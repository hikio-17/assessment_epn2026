import type {
  AssignmentStatus,
  EmployeeStatus,
  UserRole,
} from "./lib/constants";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSessionData = {
  userId: number;
};

export type DepartmentDTO = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export type EmployeeDTO = {
  id: number;
  name: string;
  email: string;
  position: string;
  salary: number;
  status: EmployeeStatus;
  photoPath: string | null;
  photoUrl: string | null;
  departmentId: number;
  department: {
    id: number;
    code: string;
    name: string;
  } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeListResult = {
  employees: EmployeeDTO[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type EmployeeDraft = {
  id: string;
  name: string;
  email: string;
  position: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type DraftFormValues = {
  name: string;
  email: string;
  position: string;
  note: string;
};

export type DraftActionData = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  values?: DraftFormValues;
};

export type EmployeeFormValues = {
  name: string;
  email: string;
  position: string;
  departmentId: string;
  salary: string;
  status: string;
};

export type EmployeeActionData = {
  ok: boolean;
  message?: string;
  action?: "create" | "update" | "delete";
  fieldErrors?: Record<string, string>;
  values?: EmployeeFormValues;
  employee?: EmployeeDTO;
};

export type DepartmentReportRow = {
  id: number;
  code: string;
  name: string;
  headcount: number;
  active: number;
  inactive: number;
  payroll: number;
  payrollShare: number;
};

export type HeadcountReport = {
  totals: {
    employees: number;
    active: number;
    inactive: number;
    departments: number;
    payroll: number;
    averageSalary: number;
  };
  departments: DepartmentReportRow[];
  generatedAt: string;
};

export type EmployeeOptionDTO = {
  id: number;
  name: string;
  email: string;
  position: string;
  status: EmployeeStatus;
};

export type AssignmentDTO = {
  id: number;
  title: string;
  status: AssignmentStatus;
  departmentId: number;
  employeeId: number;
  department: {
    id: number;
    code: string;
    name: string;
  } | null;
  employee: {
    id: number;
    name: string;
    email: string;
    position: string;
  } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

