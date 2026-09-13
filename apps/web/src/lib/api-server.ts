import "server-only";
import { cookies } from "next/headers";

/**
 * Client API — appels côté serveur (Server Components).
 * `fetch` côté serveur n'a pas de pot de cookies navigateur : on transmet
 * manuellement les cookies de la requête entrante à l'API.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export async function serverApiGet<T>(path: string): Promise<{ data: T | null; status: number }> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    return { data: null, status: res.status };
  }

  const data = (await res.json()) as T;
  return { data, status: res.status };
}
