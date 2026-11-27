import {
    AppError,
    ValidationError,
} from "./errors";

export function apiSuccess(
    data: unknown,
    message?: string,
    status = 200,
) {
    return Response.json(
        {
            ok: true,
            message,
            data,
        },
        { status },
    );
}

export function apiError(error: unknown) {
    if (error instanceof AppError) {
        return Response.json(
            {
                ok: false,
                message: error.message,
                fieldErrors: error.fieldErrors,
            },
            { status: error.status },
        );
    }

    console.error("API error:", error);

    return Response.json(
        {
            ok: false,
            message: "Terjadi kesalahan pada server.",
            fieldErrors: {},
        },
        { status: 500 },
    );
}

export async function readJsonBody(
    request: Request,
): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        throw new ValidationError(
            "Body JSON tidak valid.",
        );
    }
}