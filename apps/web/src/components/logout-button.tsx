"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className, variant = "outline" }: { className?: string; variant?: "outline" | "ghost" }) {
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
    <Button variant={variant} size="sm" onClick={handleLogout} disabled={loading} className={className}>
      {t("logout")}
    </Button>
  );
}
