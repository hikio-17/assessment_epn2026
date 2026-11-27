import {
  DepartmentEntity,
  EmployeeEntity,
  type Department,
  type Employee,
} from "../db/entities";
import type {
  DepartmentDTO,
  EmployeeOptionDTO,
} from "../types";
import { getInitializedDataSource } from "../db.server";

function toDepartmentDTO(
  department: Department,
): DepartmentDTO {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description,
  };
}

export async function listDepartments(): Promise<
  DepartmentDTO[]
> {
  const dataSource = await getInitializedDataSource();

  const departments = await dataSource
    .getRepository<Department>(DepartmentEntity)
    .find({
      order: { name: "ASC" },
    });

  return departments.map(toDepartmentDTO);
}

export async function getDepartmentById(
  id: number,
): Promise<DepartmentDTO | null> {
  const dataSource = await getInitializedDataSource();

  const department = await dataSource
    .getRepository<Department>(DepartmentEntity)
    .findOneBy({ id });

  return department
    ? toDepartmentDTO(department)
    : null;
}

export async function listEmployeesByDepartment(
  departmentId: number,
): Promise<EmployeeOptionDTO[]> {
  const dataSource = await getInitializedDataSource();

  const employees = await dataSource
    .getRepository<Employee>(EmployeeEntity)
    .find({
      where: { departmentId },
      order: { name: "ASC" },
    });

  return employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    position: employee.position,
    status: employee.status,
  }));
}