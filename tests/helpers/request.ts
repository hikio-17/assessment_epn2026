type FormValue = string | File | Blob;

export function getRequest(
  url: string,
  cookie?: string,
) {
  return new Request(url, {
    headers: cookie
      ? { Cookie: cookie }
      : undefined,
  });
}

export function formRequest(
  url: string,
  values: Record<string, FormValue>,
  cookie?: string,
) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.append(key, value);
  }

  return new Request(url, {
    method: "POST",
    body: formData,
    headers: cookie
      ? { Cookie: cookie }
      : undefined,
  });
}

export function jsonRequest(
  url: string,
  body: unknown,
  options: {
    method?: string;
    cookie?: string;
  } = {},
) {
  return new Request(url, {
    method: options.method ?? "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(options.cookie
        ? { Cookie: options.cookie }
        : {}),
    },
  });
}
