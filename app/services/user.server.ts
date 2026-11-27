import { hash } from "bcryptjs";

import { UserEntity, type User } from "../db/entities";
import { getInitializedDataSource } from "../db.server";
import {
    AppError,
    ValidationError,
    isUniqueViolation,
} from "../lib/errors";
import type { UserCreateInput } from "../lib/validation";
import type { UserDTO } from "../types";

function toUserDTO(user: User): UserDTO {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
    };
}

export async function listUsers(): Promise<UserDTO[]> {
    const dataSource = await getInitializedDataSource();
    const users = await dataSource
        .getRepository<User>(UserEntity)
        .find({
            order: { id: "ASC" },
        });

    return users.map(toUserDTO);
}

export async function createUser(
    input: UserCreateInput,
): Promise<UserDTO> {
    const dataSource = await getInitializedDataSource();
    const repository =
        dataSource.getRepository<User>(UserEntity);

    const existing = await repository.findOneBy({
        email: input.email,
    });

    if (existing) {
        throw new ValidationError(
            "Email sudah digunakan.",
            {
                email: "Email sudah digunakan.",
            },
        );
    }

    try {
        const user = repository.create({
            name: input.name,
            email: input.email,
            passwordHash: await hash(input.password, 10),
            role: input.role,
        });

        await repository.save(user);

        return toUserDTO(user);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        if (isUniqueViolation(error)) {
            throw new ValidationError(
                "Email sudah digunakan.",
                {
                    email: "Email sudah digunakan.",
                },
            );
        }

        throw error;
    }
}
