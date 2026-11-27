import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type LoadOptions = {
  silent?: boolean;
};

type MutationInput = {
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan.";
}

function fieldErrorsOf(
  payload: unknown,
): Record<string, string> {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const raw = (
    payload as { fieldErrors?: unknown }
  ).fieldErrors;

  if (!raw || typeof raw !== "object") {
    return {};
  }

  const errors: Record<string, string> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      errors[key] = value;
    }
  }

  return errors;
}

function dataOf<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export function useFetch<T>(
  url: string | null,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: Boolean(url) && enabled,
    error: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(
    null,
  );
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  const load = useCallback(
    async (loadOptions: LoadOptions = {}) => {
      if (!url) {
        setState((previous) => {
          if (
            previous.data === null &&
            !previous.loading &&
            previous.error === null
          ) {
            return previous;
          }

          return {
            data: null,
            loading: false,
            error: null,
          };
        });

        return;
      }

      const id = ++requestId.current;

      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setState((previous) => {
        if (loadOptions.silent) {
          return {
            ...previous,
            loading: true,
            error: null,
          };
        }

        if (
          previous.loading &&
          previous.data === null &&
          previous.error === null
        ) {
          return previous;
        }

        return {
          data: null,
          loading: true,
          error: null,
        };
      });

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new ApiError(
            typeof payload?.message === "string"
              ? payload.message
              : `HTTP ${response.status}`,
            response.status,
            fieldErrorsOf(payload),
          );
        }

        if (
          !mountedRef.current ||
          id !== requestId.current
        ) {
          return;
        }

        setState({
          data: dataOf<T>(payload),
          loading: false,
          error: null,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          id !== requestId.current ||
          !mountedRef.current
        ) {
          return;
        }

        setState((previous) => ({
          ...previous,
          loading: false,
          error: messageOf(error),
        }));
      }
    },
    [url],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      void load();
    }

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [load, enabled]);

  const request = useCallback(
    async (input: MutationInput): Promise<unknown> => {
      if (submittingRef.current) {
        throw new Error("Request sedang berjalan.");
      }

      submittingRef.current = true;

      if (mountedRef.current) {
        setSubmitting(true);
      }

      try {
        const response = await fetch(input.url, {
          method: input.method,
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            ...(input.body !== undefined
              ? {
                  "Content-Type": "application/json",
                }
              : {}),
          },
          body:
            input.body !== undefined
              ? JSON.stringify(input.body)
              : undefined,
        });

        const payload = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new ApiError(
            typeof payload?.message === "string"
              ? payload.message
              : `HTTP ${response.status}`,
            response.status,
            fieldErrorsOf(payload),
          );
        }

        return dataOf<unknown>(payload);
      } finally {
        submittingRef.current = false;

        if (mountedRef.current) {
          setSubmitting(false);
        }
      }
    },
    [],
  );

  return {
    ...state,
    submitting,
    refetch: load,
    request,
  };
}
