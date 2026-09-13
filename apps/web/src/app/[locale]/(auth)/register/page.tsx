"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { UserRole, Country } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import type { AuthUser } from "@/lib/types";

/** Rôles ouverts à l'inscription publique — reflète apps/api/.../register.dto.ts. */
type RegisterableRole = typeof UserRole.COMMERCANT | typeof UserRole.ANNONCEUR;

function isRegisterableRole(value: string | null): value is RegisterableRole {
  return value === UserRole.COMMERCANT || value === UserRole.ANNONCEUR;
}

function RegisterForm() {
  const t = useTranslations("Auth.register");
  const tErrors = useTranslations("Auth.errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRole = searchParams.get("role");

  const [role, setRole] = useState<RegisterableRole | null>(
    isRegisterableRole(preselectedRole) ? preselectedRole : null,
  );
  const [country, setCountry] = useState<Country>(Country.FR);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Champs commerçant
  const [businessName, setBusinessName] = useState("");
  const [businessIdNumber, setBusinessIdNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Champ annonceur
  const [companyName, setCompanyName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(tErrors("passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post<{ user: AuthUser }>("/auth/register", {
        email,
        password,
        role,
        country,
        ...(role === UserRole.COMMERCANT
          ? { businessName, businessIdNumber, addressLine1, addressLine2: addressLine2 || undefined, city, postalCode }
          : { companyName: companyName || undefined }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!role) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-bold">{t("chooseRole")}</h1>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setRole(UserRole.COMMERCANT)}
            className="rounded-lg border border-gray-300 p-4 text-left hover:border-black"
          >
            <span className="block font-semibold">{t("roleCommercant")}</span>
            <span className="block text-sm text-gray-600">{t("roleCommercantDesc")}</span>
          </button>
          <button
            type="button"
            onClick={() => setRole(UserRole.ANNONCEUR)}
            className="rounded-lg border border-gray-300 p-4 text-left hover:border-black"
          >
            <span className="block font-semibold">{t("roleAnnonceur")}</span>
            <span className="block text-sm text-gray-600">{t("roleAnnonceurDesc")}</span>
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-medium text-black underline">
            {t("loginLink")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        {role === UserRole.COMMERCANT ? t("roleCommercant") : t("roleAnnonceur")}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("country")}</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as Country)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value={Country.FR}>{t("countryFR")}</option>
            <option value={Country.ES}>{t("countryES")}</option>
          </select>
        </label>

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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
          <span className="text-xs text-gray-500">{t("passwordHint")}</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("password")} (confirmation)</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        {role === UserRole.COMMERCANT && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("businessName")}</span>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {country === Country.FR ? t("businessIdNumber") : t("businessIdNumberES")}
              </span>
              <input
                type="text"
                required
                value={businessIdNumber}
                onChange={(e) => setBusinessIdNumber(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("addressLine1")}</span>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("addressLine2")}</span>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <div className="flex gap-4">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium">{t("city")}</span>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium">{t("postalCode")}</span>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">{t("verificationNote")}</p>
          </>
        )}

        {role === UserRole.ANNONCEUR && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("companyName")}</span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {t("submit")}
        </button>
        <button type="button" onClick={() => setRole(null)} className="text-sm text-gray-500 underline">
          ← {t("chooseRole")}
        </button>
      </form>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
