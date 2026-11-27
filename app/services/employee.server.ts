import {
    EmployeeEntity,
    type Department,
    type Employee,
} from "../db/entities";
import { getInitializedDataSource } from "../db.server";
import {
    AppError,
    NotFoundError,
    ValidationError,
    isForeignKeyViolation,
    isUniqueViolation,
} from "../lib/errors";
import type { EmployeeInput } from "../lib/validation";
import type {
    EmployeeDTO,
    EmployeeListResult,
} from "../types";
import {
    deleteStoredPhotoSafely,
    saveEmployeePhoto,
    type StoredPhoto,
} from "./upload.server";

type EmployeeWithDepartment = Employee & {
    department?: Department | null;
};

function toEmployeeDTO(
    employee: EmployeeWithDepartment,
): EmployeeDTO {
    return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        position: employee.position,
        salary: employee.salary,
        status: employee.status,
        photoPath: employee.photoPath,
        photoUrl: employee.photoPath
            ? `/uploads/${employee.photoPath}`
            : null,
        departmentId: employee.departmentId,
        department: employee.department
            ? {
                id: employee.department.id,
                code: employee.department.code,
                name: employee.department.name,
            }
            : null,
        version: employee.version,
        createdAt: employee.createdAt.toISOString(),
        updatedAt: employee.updatedAt.toISOString(),
    };
}

function mapEmployeeDbError(
    error: unknown,
): unknown {
    if (error instanceof AppError) {
        return error;
    }

    if (isUniqueViolation(error)) {
        return new ValidationError(
            "Email sudah digunakan.",
            {
                email: "Email sudah digunakan.",
            },
        );
    }

    if (isForeignKeyViolation(error)) {
        return new ValidationError(
            "Department tidak ditemukan.",
            {
                departmentId: "Department tidak ditemukan.",
            },
        );
    }

    return error;
}

export async function createEmployee(
    input: EmployeeInput,
    photo: File | null,
): Promise<EmployeeDTO> {
    const dataSource = await getInitializedDataSource();
    const uploadedPhotoFiles: string[] = [];

    try {
        return await dataSource.transaction(async (manager) => {
            const duplicate = await manager.findOneBy(
                EmployeeEntity,
                { email: input.email },
            );

            if (duplicate) {
                throw new ValidationError(
                    "Email sudah digunakan.",
                    {
                        email: "Email sudah digunakan.",
                    },
                );
            }

            let photoFilename: string | null = null;

            if (photo) {
                const storedPhoto = await saveEmployeePhoto(photo);
                uploadedPhotoFiles.push(storedPhoto.filename);
                photoFilename = storedPhoto.filename;
            }

            const employee = manager.create(EmployeeEntity, {
                name: input.name,
                email: input.email,
                position: input.position,
                salary: input.salary,
                status: input.status,
                departmentId: input.departmentId,
                photoPath: photoFilename,
            });

            const saved = await manager.save(
                EmployeeEntity,
                employee,
            );

            const loaded = await manager.findOne(
                EmployeeEntity,
                {
                    where: { id: saved.id },
                    relations: { department: true },
                },
            );

            if (!loaded) {
                throw new AppError(
                    "Gagal memuat employee setelah disimpan.",
                    500,
                );
            }

            return toEmployeeDTO(loaded);
        });
    } catch (error) {
        for (const filename of uploadedPhotoFiles) {
            await deleteStoredPhotoSafely(filename);
        }

        throw mapEmployeeDbError(error);
    }
}

export async function updateEmployee(
    id: number,
    input: EmployeeInput,
    photo: File | null,
    removePhoto: boolean,
): Promise<EmployeeDTO> {
    const dataSource = await getInitializedDataSource();
    const newPhotoFiles: string[] = [];

    try {
        const result = await dataSource.transaction(
            async (manager) => {
                const employee = await manager.findOneBy(
                    EmployeeEntity,
                    { id },
                );

                if (!employee) {
                    throw new NotFoundError(
                        "Employee tidak ditemukan.",
                    );
                }

                const previousPhoto = employee.photoPath;

                if (photo) {
                    const storedPhoto = await saveEmployeePhoto(
                        photo,
                    );
                    newPhotoFiles.push(storedPhoto.filename);
                    employee.photoPath = storedPhoto.filename;
                } else if (removePhoto) {
                    employee.photoPath = null;
                }

                employee.name = input.name;
                employee.email = input.email;
                employee.position = input.position;
                employee.salary = input.salary;
                employee.status = input.status;
                employee.departmentId = input.departmentId;

                await manager.save(EmployeeEntity, employee);

                const loaded = await manager.findOne(
                    EmployeeEntity,
                    {
                        where: { id: employee.id },
                        relations: { department: true },
                    },
                );

                if (!loaded) {
                    throw new AppError(
                        "Gagal memuat employee setelah diperbarui.",
                        500,
                    );
                }

                return {
                    employee: toEmployeeDTO(loaded),
                    previousPhoto,
                };
            },
        );

        // Menghapus file lama setelah transaksi commit.
        if (
            result.previousPhoto &&
            (newPhotoFiles.length > 0 || removePhoto)
        ) {
            await deleteStoredPhotoSafely(
                result.previousPhoto,
            );
        }

        return result.employee;
    } catch (error) {
        for (const filename of newPhotoFiles) {
            await deleteStoredPhotoSafely(filename);
        }

        throw mapEmployeeDbError(error);
    }
}

export async function deleteEmployee(
    id: number,
): Promise<void> {
    const dataSource = await getInitializedDataSource();

    const photoPath = await dataSource.transaction(
        async (manager) => {
            const employee = await manager.findOneBy(
                EmployeeEntity,
                { id },
            );

            if (!employee) {
                throw new NotFoundError(
                    "Employee tidak ditemukan.",
                );
            }

            await manager.remove(EmployeeEntity, employee);

            return employee.photoPath;
        },
    );

    // Hpus file photo setelah data di database di hapus
    if (photoPath) {
        await deleteStoredPhotoSafely(photoPath);
    }
}

export async function getEmployeeById(
    id: number,
): Promise<EmployeeDTO> {
    const dataSource = await getInitializedDataSource();

    const employee = await dataSource
        .getRepository<Employee>(EmployeeEntity)
        .findOne({
            where: { id },
            relations: { department: true },
        });

    if (!employee) {
        throw new NotFoundError("Employee tidak ditemukan.");
    }

    return toEmployeeDTO(employee);
}

export type EmployeeListFilters = {
    search?: string;
    departmentId?: number;
    page?: number;
    perPage?: number;
};

export async function listEmployees(
    filters: EmployeeListFilters = {},
): Promise<EmployeeListResult> {
    const dataSource = await getInitializedDataSource();

    const page = Math.max(
        1,
        Math.trunc(filters.page ?? 1) || 1,
    );
    const perPage = Math.min(
        50,
        Math.max(
            1,
            Math.trunc(filters.perPage ?? 10) || 10,
        ),
    );

    const query = dataSource
        .getRepository<Employee>(EmployeeEntity)
        .createQueryBuilder("e")
        .leftJoinAndSelect("e.department", "department");

    const search = filters.search?.trim();

    if (search) {
        query.andWhere(
            "(e.name ILIKE :search OR e.email ILIKE :search OR e.position ILIKE :search)",
            { search: `%${search}%` },
        );
    }

    if (filters.departmentId) {
        query.andWhere(
            "e.departmentId = :departmentId",
            { departmentId: filters.departmentId },
        );
    }

    query
        .orderBy("e.createdAt", "DESC")
        .addOrderBy("e.id", "DESC")
        .skip((page - 1) * perPage)
        .take(perPage);

    const [employees, total] =
        await query.getManyAndCount();

    return {
        employees: employees.map(toEmployeeDTO),
        total,
        page,
        perPage,
        totalPages: Math.max(
            1,
            Math.ceil(total / perPage),
        ),
    };
}