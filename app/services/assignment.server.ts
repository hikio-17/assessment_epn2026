import type { EntityManager } from "typeorm";

import {
    AssignmentEntity,
    EmployeeEntity,
    type Assignment,
    type Department,
    type Employee,
} from "../db/entities";
import { getInitializedDataSource } from "../db.server";
import { retryOnSerializationFailure } from "../lib/concurrency";
import {
    AppError,
    ConflictError,
    NotFoundError,
    ValidationError,
    getDriverConstraintName,
    isForeignKeyViolation,
    isUniqueViolation,
} from "../lib/errors";
import type {
    AssignmentCreateInput,
    AssignmentUpdateInput,
} from "../lib/validation";
import type { AssignmentDTO } from "../types";

type AssignmentWithRelations = Assignment & {
    department?: Department | null;
    employee?: Employee | null;
};

function toAssignmentDTO(
    assignment: AssignmentWithRelations,
): AssignmentDTO {
    return {
        id: assignment.id,
        title: assignment.title,
        status: assignment.status,
        departmentId: assignment.departmentId,
        employeeId: assignment.employeeId,
        department: assignment.department
            ? {
                id: assignment.department.id,
                code: assignment.department.code,
                name: assignment.department.name,
            }
            : null,
        employee: assignment.employee
            ? {
                id: assignment.employee.id,
                name: assignment.employee.name,
                email: assignment.employee.email,
                position: assignment.employee.position,
            }
            : null,
        version: assignment.version,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
    };
}

async function loadAssignmentDTO(
    manager: EntityManager,
    id: number,
): Promise<AssignmentDTO> {
    const assignment = await manager.findOne(
        AssignmentEntity,
        {
            where: { id },
            relations: {
                department: true,
                employee: true,
            },
        },
    );

    if (!assignment) {
        throw new NotFoundError(
            "Assignment tidak ditemukan.",
        );
    }

    return toAssignmentDTO(assignment);
}

function mapAssignmentDbError(
    error: unknown,
): unknown {
    if (error instanceof AppError) {
        return error;
    }

    if (
        error instanceof Error &&
        error.name ===
        "OptimisticLockVersionMismatchError"
    ) {
        return new ConflictError(
            "Data sudah diubah pengguna lain. Silakan muat ulang.",
        );
    }

    if (isUniqueViolation(error)) {
        return new ConflictError(
            "Employee sudah memiliki assignment ACTIVE.",
            {
                employeeId:
                    "Employee sudah memiliki assignment ACTIVE.",
            },
        );
    }

    if (isForeignKeyViolation(error)) {
        const constraint =
            getDriverConstraintName(error);

        if (constraint?.includes("employee")) {
            return new ValidationError(
                "Employee tidak ditemukan.",
                {
                    employeeId: "Employee tidak ditemukan.",
                },
            );
        }

        if (constraint?.includes("department")) {
            return new ValidationError(
                "Department tidak ditemukan.",
                {
                    departmentId:
                        "Department tidak ditemukan.",
                },
            );
        }

        return new ValidationError(
            "Relasi assignment tidak valid.",
        );
    }

    return error;
}

async function validateEmployeeDepartment(
    manager: EntityManager,
    employeeId: number,
    departmentId: number,
): Promise<Employee> {
    const employee = await manager.findOne(
        EmployeeEntity,
        {
            where: { id: employeeId },
            lock: { mode: "pessimistic_write" },
        },
    );

    if (!employee) {
        throw new ValidationError(
            "Employee tidak ditemukan.",
            {
                employeeId: "Employee tidak ditemukan.",
            },
        );
    }

    if (employee.departmentId !== departmentId) {
        throw new ValidationError(
            "Employee bukan anggota department yang dipilih.",
            {
                employeeId:
                    "Employee bukan anggota department yang dipilih.",
            },
        );
    }

    return employee;
}

export async function listAssignments(): Promise<
    AssignmentDTO[]
> {
    const dataSource = await getInitializedDataSource();

    const assignments = await dataSource
        .getRepository<Assignment>(AssignmentEntity)
        .find({
            relations: {
                department: true,
                employee: true,
            },
            order: {
                createdAt: "DESC",
                id: "DESC",
            },
        });

    return assignments.map(toAssignmentDTO);
}

export async function getAssignmentById(
    id: number,
): Promise<AssignmentDTO> {
    const dataSource = await getInitializedDataSource();

    const assignment = await dataSource
        .getRepository<Assignment>(AssignmentEntity)
        .findOne({
            where: { id },
            relations: {
                department: true,
                employee: true,
            },
        });

    if (!assignment) {
        throw new NotFoundError(
            "Assignment tidak ditemukan.",
        );
    }

    return toAssignmentDTO(assignment);
}

export async function createAssignment(
    input: AssignmentCreateInput,
): Promise<AssignmentDTO> {
    const dataSource = await getInitializedDataSource();

    try {
        return await retryOnSerializationFailure(() =>
            dataSource.transaction(
                "SERIALIZABLE",
                async (manager) => {
                    // Lock row employee supaya request concurrent
                    // untuk employee yang sama diserialisasi.
                    await validateEmployeeDepartment(
                        manager,
                        input.employeeId,
                        input.departmentId,
                    );

                    if (input.status === "ACTIVE") {
                        const active =
                            await manager.findOneBy(
                                AssignmentEntity,
                                {
                                    employeeId: input.employeeId,
                                    status: "ACTIVE",
                                },
                            );

                        if (active) {
                            throw new ConflictError(
                                "Employee sudah memiliki assignment ACTIVE.",
                                {
                                    employeeId:
                                        "Employee sudah memiliki assignment ACTIVE.",
                                },
                            );
                        }
                    }

                    const assignment = manager.create(
                        AssignmentEntity,
                        {
                            title: input.title,
                            status: input.status,
                            departmentId: input.departmentId,
                            employeeId: input.employeeId,
                        },
                    );

                    const saved = await manager.save(
                        AssignmentEntity,
                        assignment,
                    );

                    return loadAssignmentDTO(
                        manager,
                        saved.id,
                    );
                },
            ),
        );
    } catch (error) {
        throw mapAssignmentDbError(error);
    }
}

export async function updateAssignment(
    id: number,
    input: AssignmentUpdateInput,
): Promise<AssignmentDTO> {
    const dataSource = await getInitializedDataSource();

    try {
        return await retryOnSerializationFailure(() =>
            dataSource.transaction(
                "SERIALIZABLE",
                async (manager) => {
                    // Lock assignment target.
                    const current = await manager.findOne(
                        AssignmentEntity,
                        {
                            where: { id },
                            lock: {
                                mode: "pessimistic_write",
                            },
                        },
                    );

                    if (!current) {
                        throw new NotFoundError(
                            "Assignment tidak ditemukan.",
                        );
                    }

                    // Optimistic version check.
                    if (current.version !== input.version) {
                        throw new ConflictError(
                            "Data sudah diubah pengguna lain. Silakan muat ulang.",
                            {
                                version:
                                    "Version assignment sudah tidak sesuai.",
                            },
                        );
                    }

                    // Lock employee tujuan untuk mencegah race
                    // saat memindahkan assignment.
                    await validateEmployeeDepartment(
                        manager,
                        input.employeeId,
                        input.departmentId,
                    );

                    if (input.status === "ACTIVE") {
                        const active =
                            await manager.findOneBy(
                                AssignmentEntity,
                                {
                                    employeeId: input.employeeId,
                                    status: "ACTIVE",
                                },
                            );

                        if (active && active.id !== id) {
                            throw new ConflictError(
                                "Employee sudah memiliki assignment ACTIVE.",
                                {
                                    employeeId:
                                        "Employee sudah memiliki assignment ACTIVE.",
                                },
                            );
                        }
                    }

                    current.title = input.title;
                    current.status = input.status;
                    current.departmentId = input.departmentId;
                    current.employeeId = input.employeeId;

                    await manager.save(
                        AssignmentEntity,
                        current,
                    );

                    return loadAssignmentDTO(
                        manager,
                        current.id,
                    );
                },
            ),
        );
    } catch (error) {
        throw mapAssignmentDbError(error);
    }
}

export async function deleteAssignment(
    id: number,
): Promise<void> {
    const dataSource = await getInitializedDataSource();

    try {
        await retryOnSerializationFailure(() =>
            dataSource.transaction(
                "SERIALIZABLE",
                async (manager) => {
                    const assignment = await manager.findOne(
                        AssignmentEntity,
                        {
                            where: { id },
                            lock: {
                                mode: "pessimistic_write",
                            },
                        },
                    );

                    if (!assignment) {
                        throw new NotFoundError(
                            "Assignment tidak ditemukan.",
                        );
                    }

                    await manager.remove(
                        AssignmentEntity,
                        assignment,
                    );
                },
            ),
        );
    } catch (error) {
        throw mapAssignmentDbError(error);
    }
}