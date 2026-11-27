import { hashSync } from "bcryptjs";

import {
  AssignmentEntity,
  DepartmentEntity,
  EmployeeEntity,
  UserEntity,
  type Assignment,
  type Department,
  type Employee,
  type User,
} from "~/db/entities";
import { getInitializedDataSource } from "~/db.server";
import type { AuthUser } from "~/types";

export const TEST_PASSWORD = "Password123!";

const PASSWORD_HASH = hashSync(TEST_PASSWORD, 4);

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function seedBaseData() {
  const dataSource = await getInitializedDataSource();

  const userRepository =
    dataSource.getRepository<User>(UserEntity);
  const departmentRepository =
    dataSource.getRepository<Department>(
      DepartmentEntity,
    );
  const employeeRepository =
    dataSource.getRepository<Employee>(EmployeeEntity);
  const assignmentRepository =
    dataSource.getRepository<Assignment>(
      AssignmentEntity,
    );

  const admin = await userRepository.save({
    name: "Admin User",
    email: "admin@test.local",
    passwordHash: PASSWORD_HASH,
    role: "ADMIN",
  });
  const hr = await userRepository.save({
    name: "HR User",
    email: "hr@test.local",
    passwordHash: PASSWORD_HASH,
    role: "HR",
  });
  const viewer = await userRepository.save({
    name: "Viewer User",
    email: "viewer@test.local",
    passwordHash: PASSWORD_HASH,
    role: "VIEWER",
  });

  const it = await departmentRepository.save({
    code: "IT",
    name: "Information Technology",
    description: "IT department",
  });
  const hrDepartment =
    await departmentRepository.save({
      code: "HR",
      name: "Human Resources",
      description: "HR department",
    });
  const finance = await departmentRepository.save({
    code: "FIN",
    name: "Finance",
    description: "Finance department",
  });

  const angga = await employeeRepository.save({
    name: "Angga Marta",
    email: "angga@test.local",
    position: "Backend Engineer",
    salary: 14_000_000,
    status: "ACTIVE",
    photoPath: null,
    departmentId: it.id,
  });
  const siti = await employeeRepository.save({
    name: "Siti Rahma",
    email: "siti@test.local",
    position: "Frontend Engineer",
    salary: 13_500_000,
    status: "ACTIVE",
    photoPath: null,
    departmentId: it.id,
  });
  const maya = await employeeRepository.save({
    name: "Maya Putri",
    email: "maya@test.local",
    position: "HR Generalist",
    salary: 9_000_000,
    status: "ACTIVE",
    photoPath: null,
    departmentId: hrDepartment.id,
  });
  const dewi = await employeeRepository.save({
    name: "Dewi Lestari",
    email: "dewi@test.local",
    position: "Accountant",
    salary: 10_000_000,
    status: "ACTIVE",
    photoPath: null,
    departmentId: finance.id,
  });

  const assignment = await assignmentRepository.save({
    title: "Onboarding Flow Revamp",
    status: "ACTIVE",
    departmentId: it.id,
    employeeId: angga.id,
  });

  return {
    admin: toAuthUser(admin),
    hr: toAuthUser(hr),
    viewer: toAuthUser(viewer),
    users: { admin, hr, viewer },
    departments: {
      it,
      hr: hrDepartment,
      finance,
    },
    employees: {
      angga,
      siti,
      maya,
      dewi,
    },
    assignment,
  };
}
