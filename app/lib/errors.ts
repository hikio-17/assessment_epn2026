export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;

  constructor(
    message: string,
    status = 500,
    fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Data tidak valid.",
    fieldErrors: FieldErrors = {},
  ) {
    super(message, 400, fieldErrors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden.") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Data tidak ditemukan.") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "Data sudah berubah. Silakan muat ulang.",
    fieldErrors: FieldErrors = {},
  ) {
    super(message, 409, fieldErrors);
  }
}

function getDriverErrorCode(
  error: unknown,
): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const driverError = (
    error as { driverError?: { code?: unknown } }
  ).driverError;

  return typeof driverError?.code === "string"
    ? driverError.code
    : undefined;
}

export function isUniqueViolation(
  error: unknown,
): boolean {
  return getDriverErrorCode(error) === "23505";
}

export function isForeignKeyViolation(
  error: unknown,
): boolean {
  return getDriverErrorCode(error) === "23503";
}

export function isSerializationFailure(
  error: unknown,
): boolean {
  const code = getDriverErrorCode(error);
  return code === "40001" || code === "40P01";
}

export function getDriverConstraintName(
  error: unknown,
): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const constraint = (
    error as {
      driverError?: {
        constraint?: unknown;
      };
    }
  ).driverError?.constraint;

  return typeof constraint === "string"
    ? constraint
    : undefined;
}