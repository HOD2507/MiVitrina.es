"use client";

import { useEffect, useState } from "react";
import { api } from "./api-client";

export interface AuthProvidersConfig {
  googleEnabled: boolean;
}

/**
 * `null` tant que la réponse n'est pas arrivée (évite un flash de la
 * mise en page "classique" avant de basculer sur la mise en page
 * "boutons + Continuer avec email" si un fournisseur est disponible).
 */
export function useAuthProviders(): AuthProvidersConfig | null {
  const [config, setConfig] = useState<AuthProvidersConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AuthProvidersConfig>("/auth/config")
      .then((res) => {
        if (!cancelled) setConfig(res);
      })
      .catch(() => {
        if (!cancelled) setConfig({ googleEnabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
