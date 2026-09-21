"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { api } from "@/lib/api-client";

const COUNTS_CHANGED_EVENT = "mivitrina:counts-changed";
const POLL_MS = 30_000;

/** Avisa a los indicadores del menú de que un contador puede haber cambiado (p. ej. tras leer o responder un ticket). */
export function notifyCountsChanged() {
  window.dispatchEvent(new Event(COUNTS_CHANGED_EVENT));
}

/**
 * Contador vivo para los indicadores del menú (`GET path` → `{ count }`). Parte del valor calculado en el servidor,
 * y se vuelve a pedir al cambiar de página, cada 30 s (solo con la pestaña visible) y cuando alguien llama a
 * `notifyCountsChanged`. `path` nulo = sin consultas. Sin websockets al MVP, igual que el chat.
 */
export function useCount(path: string | null, initial: number): number {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();
  const first = useRef(true);

  const refresh = useCallback(async () => {
    if (!path) return; // sin permiso/ruta: el contador se queda en su valor inicial
    try {
      setCount((await api.get<{ count: number }>(path)).count);
    } catch {
      // Indicador secundario: un fallo puntual no debe molestar al usuario.
    }
  }, [path]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) refresh();
    };
    const interval = setInterval(tick, POLL_MS);
    window.addEventListener(COUNTS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(COUNTS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return count;
}
