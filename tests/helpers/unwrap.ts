export type UnwrappedResult = {
  data: unknown;
  status: number;
  headers: Headers;
};

export async function unwrap(
  result: unknown,
): Promise<UnwrappedResult> {
  if (result instanceof Response) {
    const text = await result.clone().text();
    let body: unknown = text;

    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return {
      data: body,
      status: result.status,
      headers: result.headers,
    };
  }

  if (
    result &&
    typeof result === "object" &&
    (result as { type?: string }).type ===
      "DataWithResponseInit"
  ) {
    const value = result as {
      data: unknown;
      init?: ResponseInit | null;
    };

    return {
      data: value.data,
      status: value.init?.status ?? 200,
      headers: new Headers(value.init?.headers),
    };
  }

  return {
    data: result,
    status: 200,
    headers: new Headers(),
  };
}

export async function capture(
  promise: Promise<unknown>,
): Promise<{
  result?: unknown;
  response?: Response;
}> {
  try {
    return { result: await promise };
  } catch (error) {
    if (error instanceof Response) {
      return { response: error };
    }

    throw error;
  }
}
