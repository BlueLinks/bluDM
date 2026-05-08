import type { ApiError } from "../../types";

export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: isFormData
      ? init.headers
      : {
          "Content-Type": "application/json",
          ...init.headers,
        },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Request failed" }))) as ApiError;
    throw new Error(payload.error || "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
