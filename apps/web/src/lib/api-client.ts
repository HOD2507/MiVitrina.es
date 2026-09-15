/**
 * Client API — appels côté navigateur (composants client).
 * `credentials: "include"` est nécessaire pour que les cookies httpOnly
 * (access_token/refresh_token) posés par l'API sur localhost:4000 soient
 * envoyés malgré le port différent de celui du frontend (localhost:3000) ;
 * les deux hôtes étant "localhost", ils sont considérés same-site par les
 * navigateurs, donc SameSite=Lax suffit (voir apps/api AuthController).
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (body as { message?: string | string[] } | null)?.message;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(" ") : (message ?? "Une erreur est survenue."));
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
