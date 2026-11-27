import { hash } from "bcryptjs";

import { buildDataSource } from "../app/db.server";
import {
  AssignmentEntity,
  DepartmentEntity,
  EmployeeEntity,
  UserEntity,
  type Assignment,
  type Department,
  type Employee,
  type User,
} from "../app/db/entities";

const DEMO_PASSWORD = "Password123!";

async function main() {
  const dataSource = buildDataSource({ synchronize: false });

  await dataSource.initialize();

  try {
    await dataSource.synchronize();

    await dataSource.query(
      'TRUNCATE TABLE "assignments", "employees", "departments", "users" RESTART IDENTITY CASCADE',
    );

    const passwordHash = await hash(DEMO_PASSWORD, 10);

    const userRepo = dataSource.getRepository<User>(UserEntity);
    const departmentRepo =
      dataSource.getRepository<Department>(DepartmentEntity);
    const employeeRepo = dataSource.getRepository<Employee>(EmployeeEntity);
    const assignmentRepo =
      dataSource.getRepository<Assignment>(AssignmentEntity);

    const userRows: Array<
      Pick<User, "name" | "email" | "passwordHash" | "role">
    > = [
      {
        name: "Rina Administrator",
        email: "admin@peopleops.test",
        passwordHash,
        role: "ADMIN",
      },
      {
        name: "Dimas HR",
        email: "hr@peopleops.test",
        passwordHash,
        role: "HR",
      },
      {
        name: "Sari Viewer",
        email: "viewer@peopleops.test",
        passwordHash,
        role: "VIEWER",
      },
    ];

    await userRepo.save(userRows);

    const departmentRows: Array<
      Pick<Department, "code" | "name" | "description">
    > = [
      {
        code: "IT",
        name: "Information Technology",
        description:
          "Product engineering, infrastructure, and quality assurance.",
      },
      {
        code: "HR",
        name: "Human Resources",
        description:
          "People operations, recruitment, and company culture.",
      },
      {
        code: "FIN",
        name: "Finance",
        description:
          "Accounting, payroll, and financial planning.",
      },
      {
        code: "MKT",
        name: "Marketing",
        description:
          "Brand, content, and growth campaigns.",
      },
      {
        code: "OPS",
        name: "Operations",
        description:
          "Warehouse, logistics, and office operations.",
      },
    ];

    const savedDepartments = await departmentRepo.save(departmentRows);

    const departmentIdByCode = new Map(
      savedDepartments.map((department) => [
        department.code,
        department.id,
      ]),
    );

    const getDepartmentId = (code: string) => {
      const id = departmentIdByCode.get(code);

      if (!id) {
        throw new Error(`Department ${code} tidak ditemukan`);
      }

      return id;
    };

    const employeeRows: Array<
      Pick<
        Employee,
        | "name"
        | "email"
        | "position"
        | "salary"
        | "status"
        | "photoPath"
        | "departmentId"
      >
    > = [
      {
        name: "Angga Marta",
        email: "angga.marta@peopleops.test",
        position: "Backend Engineer",
        salary: 14_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("IT"),
      },
      {
        name: "Siti Rahma",
        email: "siti.rahma@peopleops.test",
        position: "Frontend Engineer",
        salary: 13_500_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("IT"),
      },
      {
        name: "Budi Santoso",
        email: "budi.santoso@peopleops.test",
        position: "DevOps Engineer",
        salary: 15_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("IT"),
      },
      {
        name: "Putri Amelia",
        email: "putri.amelia@peopleops.test",
        position: "QA Engineer",
        salary: 12_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("IT"),
      },
      {
        name: "Maya Putri",
        email: "maya.putri@peopleops.test",
        position: "HR Generalist",
        salary: 9_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("HR"),
      },
      {
        name: "Rizky Pratama",
        email: "rizky.pratama@peopleops.test",
        position: "Recruiter",
        salary: 8_500_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("HR"),
      },
      {
        name: "Dewi Lestari",
        email: "dewi.lestari@peopleops.test",
        position: "Accountant",
        salary: 10_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("FIN"),
      },
      {
        name: "Andi Wijaya",
        email: "andi.wijaya@peopleops.test",
        position: "Finance Manager",
        salary: 18_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("FIN"),
      },
      {
        name: "Linda Halim",
        email: "linda.halim@peopleops.test",
        position: "Content Strategist",
        salary: 9_500_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("MKT"),
      },
      {
        name: "Fajar Nugroho",
        email: "fajar.nugroho@peopleops.test",
        position: "Performance Marketer",
        salary: 11_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("MKT"),
      },
      {
        name: "Nadia Kusuma",
        email: "nadia.kusuma@peopleops.test",
        position: "Operations Lead",
        salary: 16_000_000,
        status: "ACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("OPS"),
      },
      {
        name: "Eko Saputra",
        email: "eko.saputra@peopleops.test",
        position: "Warehouse Coordinator",
        salary: 7_500_000,
        status: "INACTIVE",
        photoPath: null,
        departmentId: getDepartmentId("OPS"),
      },
    ];

    const savedEmployees = await employeeRepo.save(employeeRows);

    const employeeIdByEmail = new Map(
      savedEmployees.map((employee) => [
        employee.email,
        employee.id,
      ]),
    );

    const getEmployeeId = (email: string) => {
      const id = employeeIdByEmail.get(email);

      if (!id) {
        throw new Error(`Employee ${email} tidak ditemukan`);
      }

      return id;
    };

    const assignmentRows: Array<
      Pick<
        Assignment,
        "title" | "status" | "departmentId" | "employeeId"
      >
    > = [
      {
        title: "Onboarding Flow Revamp",
        status: "ACTIVE",
        departmentId: getDepartmentId("IT"),
        employeeId: getEmployeeId("angga.marta@peopleops.test"),
      },
      {
        title: "QA Automation Setup",
        status: "ACTIVE",
        departmentId: getDepartmentId("IT"),
        employeeId: getEmployeeId("putri.amelia@peopleops.test"),
      },
      {
        title: "Q4 Recruitment Drive",
        status: "ACTIVE",
        departmentId: getDepartmentId("HR"),
        employeeId: getEmployeeId("rizky.pratama@peopleops.test"),
      },
      {
        title: "Payroll Migration",
        status: "ACTIVE",
        departmentId: getDepartmentId("FIN"),
        employeeId: getEmployeeId("dewi.lestari@peopleops.test"),
      },
      {
        title: "Campaign Landing Page",
        status: "ACTIVE",
        departmentId: getDepartmentId("MKT"),
        employeeId: getEmployeeId("linda.halim@peopleops.test"),
      },
      {
        title: "Warehouse Audit",
        status: "COMPLETED",
        departmentId: getDepartmentId("OPS"),
        employeeId: getEmployeeId("eko.saputra@peopleops.test"),
      },
      {
        title: "Operations Dashboard",
        status: "ACTIVE",
        departmentId: getDepartmentId("OPS"),
        employeeId: getEmployeeId("nadia.kusuma@peopleops.test"),
      },
    ];

    await assignmentRepo.save(assignmentRows);

    console.log("Seed selesai.");
    console.log(`Users: ${userRows.length}`);
    console.log(`Departments: ${departmentRows.length}`);
    console.log(`Employees: ${employeeRows.length}`);
    console.log(`Assignments: ${assignmentRows.length}`);
    console.log("");
    console.log("Demo akun login:");
    console.log(`  admin@peopleops.test / ${DEMO_PASSWORD} (ADMIN)`);
    console.log(`  hr@peopleops.test / ${DEMO_PASSWORD} (HR)`);
    console.log(`  viewer@peopleops.test / ${DEMO_PASSWORD} (VIEWER)`);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error("Seed gagal:", error);
  process.exitCode = 1;
});