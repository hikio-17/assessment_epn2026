import { compare } from "bcryptjs";

import { getInitializedDataSource } from "./db.server";
import { UserEntity, type User } from "./db/entities";
import type { AuthUser } from "./types";

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function getUserById(
  userId: number,
): Promise<AuthUser | null> {
  const dataSource = await getInitializedDataSource();

  const user = await dataSource
    .getRepository<User>(UserEntity)
    .findOneBy({ id: userId });

  return user ? toAuthUser(user) : null;
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const dataSource = await getInitializedDataSource();

  const user = await dataSource
    .getRepository<User>(UserEntity)
    .createQueryBuilder("u")
    .addSelect("u.passwordHash")
    .where("LOWER(u.email) = LOWER(:email)", { email })
    .getOne();

  if (!user) return null;

  const isValid = await compare(password, user.passwordHash);

  return isValid ? toAuthUser(user) : null;
}