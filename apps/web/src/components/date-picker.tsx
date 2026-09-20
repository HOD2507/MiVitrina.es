"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "cn";
import { getDateLocale } from "@/lib/date-locale";

/** 1er janvier 2024 était un lundi : sert de base pour générer les
 * initiales des jours de la semaine dans le bon ordre et la bonne langue. */
function buildWeekdays(localeTag: string): string[] {
  const formatter = new Intl.DateTimeFormat(localeTag, { weekday: "narrow" });
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Grille de 6×7 jours pour le mois donné, en commençant un lundi (convention FR). */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // 0 = lundi
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}

export interface BlockedRange {
  startDate: string;
  endDate: string;
}

interface DatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  minDate?: string;
  id?: string;
  /** Périodes déjà réservées — les jours qui y tombent s'affichent en rouge et ne sont pas sélectionnables. */
  blockedRanges?: BlockedRange[];
  /**
   * Si fourni, calcule la date de fin (exclusive) de la période qui
   * démarrerait à `startIso` — pour marquer en rouge un jour de départ
   * dont la période complète chevaucherait une réservation existante,
   * même si ce jour précis n'est pas lui-même occupé (ex: réservation
   * "par semaine" du 20 au 26 → le 19 doit aussi être bloqué comme
   * départ, sa période 19→26 chevauchant celle du 20). Sans cette
   * fonction, seuls les jours strictement compris dans une période
   * bloquée sont désactivés.
   */
  computeRangeEnd?: (startIso: string) => string | null;
}

/**
 * Calendrier personnalisé — remplace le `<input type="date">` natif dont
 * le rendu dépend entièrement du navigateur/OS. Le panneau est rendu
 * dans un portail (document.body) plutôt qu'en enfant direct : sans ça,
 * il se retrouve tronqué par le premier ancêtre `overflow-hidden`
 * rencontré (ex: le composant Card, qui l'utilise pour ses coins
 * arrondis) — bug réel constaté sur la page de réservation.
 */
export function DatePicker({ value, onChange, minDate, id, blockedRanges = [], computeRangeEnd }: DatePickerProps) {
  const t = useTranslations("Reservations");
  const locale = useLocale();
  const localeTag = getDateLocale(locale);
  const WEEKDAYS = useMemo(() => buildWeekdays(localeTag), [localeTag]);
  const MONTH_FORMATTER = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" }),
    [localeTag],
  );
  const DATE_FORMATTER = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", year: "numeric" }),
    [localeTag],
  );
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const selected = fromIso(value);
  const [viewYear, setViewYear] = useState(selected.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getUTCMonth());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 8, left: rect.left, width: rect.width });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const min = minDate ? fromIso(minDate) : null;
  // Contrairement à `value`/`minDate` (dates courtes "2026-09-20"), l'API
  // renvoie des datetimes ISO complets ("2026-09-20T00:00:00.000Z") pour
  // les périodes bloquées — `fromIso` planterait en leur ajoutant un
  // second suffixe "Tccc". `new Date(...)` les parse directement.
  const blockedStarts = blockedRanges.map((r) => new Date(r.startDate));
  const blockedEnds = blockedRanges.map((r) => new Date(r.endDate));
  const days = buildMonthGrid(viewYear, viewMonth);

  function isBlocked(day: Date) {
    if (!computeRangeEnd) {
      return blockedRanges.some((_, i) => day >= blockedStarts[i] && day < blockedEnds[i]);
    }
    // On teste le chevauchement entre la période complète qui démarrerait
    // ce jour-là (day → rangeEnd exclu) et chaque période déjà réservée,
    // pas seulement le jour lui-même.
    const rangeEndIso = computeRangeEnd(toIso(day));
    const rangeEnd = rangeEndIso ? new Date(`${rangeEndIso}T00:00:00Z`) : new Date(day.getTime() + 86_400_000);
    return blockedRanges.some((_, i) => day < blockedEnds[i] && rangeEnd > blockedStarts[i]);
  }

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  function select(day: Date) {
    if (min && day < min) return;
    if (isBlocked(day)) return;
    onChange(toIso(day));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 max-lg:h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-base transition-colors outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      >
        <span className="inline-block first-letter:uppercase">{DATE_FORMATTER.format(selected)}</span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-[1100] w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                aria-label={t("previousMonth")}
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-medium first-letter:uppercase">
                {MONTH_FORMATTER.format(new Date(Date.UTC(viewYear, viewMonth, 1)))}
              </p>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                aria-label={t("nextMonth")}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="py-1">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = day.getUTCMonth() === viewMonth;
                const isSelected = toIso(day) === value;
                const beforeMin = !!min && day < min;
                const blocked = isBlocked(day);
                const isDisabled = beforeMin || blocked;
                const isToday = toIso(day) === toIso(new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isDisabled}
                    title={blocked ? t("alreadyBooked") : undefined}
                    onClick={() => select(day)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md text-sm transition-colors",
                      !isCurrentMonth && "text-muted-foreground/40",
                      isCurrentMonth && !isSelected && !blocked && "hover:bg-muted",
                      isSelected && "bg-primary text-primary-foreground font-medium",
                      blocked && isCurrentMonth && "cursor-not-allowed bg-destructive/10 text-destructive line-through",
                      beforeMin && !blocked && "cursor-not-allowed opacity-30 hover:bg-transparent",
                      isToday && !isSelected && "border border-primary/40",
                    )}
                  >
                    {day.getUTCDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-full bg-destructive/40" />
              {t("alreadyBookedLegend")}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
