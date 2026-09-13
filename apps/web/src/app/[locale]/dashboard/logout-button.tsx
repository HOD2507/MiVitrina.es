"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api-client";

export function LogoutButton() {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await api.post("/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
    >
      {t("logout")}
    </button>
  );
}
