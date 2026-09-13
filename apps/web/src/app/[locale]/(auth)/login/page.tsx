"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { AuthUser } from "@/lib/types";

export default function LoginPage() {
  const t = useTranslations("Auth.login");
  const tErrors = useTranslations("Auth.errors");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<{ user: AuthUser }>("/auth/login", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("password")}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {t("submit")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-black underline">
          {t("registerLink")}
        </Link>
      </p>
    </>
  );
}
