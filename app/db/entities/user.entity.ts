import { EntitySchema } from "typeorm";
import { USER_ROLES, type UserRole } from "../../lib/constants";

export interface User {
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export const UserEntity = new EntitySchema<User>({
    name: "User",
    tableName: "users",
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
        passwordHash: {
            name: "password_hash",
            type: "varchar",
            length: 255,
            select: false,
        },
        role: {
            type: "enum",
            enum: [...USER_ROLES],
            enumName: "user_role",
            default: "VIEWER",
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
});