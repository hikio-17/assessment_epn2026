import { EntitySchema } from "typeorm";
import {
  EMPLOYEE_STATUSES,
  type EmployeeStatus,
} from "../../lib/constants";
import type { Department } from "./department.entity";

export interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  salary: number;
  status: EmployeeStatus;
  photoPath: string | null;
  departmentId: number;
  department?: Department;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export const EmployeeEntity = new EntitySchema<Employee>({
  name: "Employee",
  tableName: "employees",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: "increment",
    },
    name: {
      type: "varchar",
      length: 120,
    },
    email: {
      type: "varchar",
      length: 180,
      unique: true,
    },
    position: {
      type: "varchar",
      length: 120,
    },
    salary: {
      type: "int",
    },
    status: {
      type: "enum",
      enum: [...EMPLOYEE_STATUSES],
      enumName: "employee_status",
      default: "ACTIVE",
    },
    photoPath: {
      name: "photo_path",
      type: "varchar",
      length: 255,
      nullable: true,
    },
    departmentId: {
      name: "department_id",
      type: "int",
    },
    version: {
      type: "int",
      version: true,
      default: 1,
    },
    createdAt: {
      name: "created_at",
      type: "timestamptz",
      createDate: true,
    },
    updatedAt: {
      name: "updated_at",
      type: "timestamptz",
      updateDate: true,
    },
  },
  relations: {
    department: {
      type: "many-to-one",
      target: "Department",
      joinColumn: {
        name: "department_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_employees_department",
      },
      nullable: false,
      onDelete: "RESTRICT",
    },
  },
  indices: [
    {
      name: "idx_employees_department",
      columns: ["departmentId"],
    },
  ],
  checks: [
    {
      name: "chk_employees_salary_non_negative",
      expression: `"salary" >= 0`,
    },
  ],
});