export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

/** Пустой в проде = относительные URL (прокси Vite → Prism). */
export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...init?.headers,
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data, typeof data === "object" && data && "message" in data ? String((data as { message: unknown }).message) : undefined);
  }
  return data as T;
}
