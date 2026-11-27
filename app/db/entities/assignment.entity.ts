import { EntitySchema } from "typeorm";
import {
  ASSIGNMENT_STATUSES,
  type AssignmentStatus,
} from "../../lib/constants";
import type { Department } from "./department.entity";
import type { Employee } from "./employee.entity";

export interface Assignment {
  id: number;
  title: string;
  status: AssignmentStatus;
  departmentId: number;
  employeeId: number;
  department?: Department;
  employee?: Employee;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export const AssignmentEntity = new EntitySchema<Assignment>({
  name: "Assignment",
  tableName: "assignments",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: "increment",
    },
    title: {
      type: "varchar",
      length: 160,
    },
    status: {
      type: "enum",
      enum: [...ASSIGNMENT_STATUSES],
      enumName: "assignment_status",
      default: "ACTIVE",
    },
    departmentId: {
      name: "department_id",
      type: "int",
    },
    employeeId: {
      name: "employee_id",
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
        foreignKeyConstraintName: "fk_assignments_department",
      },
      nullable: false,
      onDelete: "RESTRICT",
    },
    employee: {
      type: "many-to-one",
      target: "Employee",
      joinColumn: {
        name: "employee_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "fk_assignments_employee",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
  indices: [
    {
      name: "idx_assignments_department",
      columns: ["departmentId"],
    },
    {
      name: "uq_assignments_active_employee",
      columns: ["employeeId"],
      unique: true,
      where: `"status" = 'ACTIVE'`,
    },
  ],
});