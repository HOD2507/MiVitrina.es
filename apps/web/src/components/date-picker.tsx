"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "cn";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

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

interface DatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  minDate?: string;
  id?: string;
}

/**
 * Calendrier personnalisé — remplace le `<input type="date">` natif dont
 * le rendu dépend entièrement du navigateur/OS (jamais cohérent avec le
 * reste du design). Pas de librairie : la logique de grille tient en
 * quelques lignes et le contrôle total sur le style vaut la dépendance
 * en moins.
 */
export function DatePicker({ value, onChange, minDate, id }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = fromIso(value);
  const [viewYear, setViewYear] = useState(selected.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getUTCMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const min = minDate ? fromIso(minDate) : null;
  const days = buildMonthGrid(viewYear, viewMonth);

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  function select(day: Date) {
    if (min && day < min) return;
    onChange(toIso(day));
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-base transition-colors outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      >
        <span className="capitalize">{DATE_FORMATTER.format(selected)}</span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-medium capitalize">{MONTH_FORMATTER.format(new Date(Date.UTC(viewYear, viewMonth, 1)))}</p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
              aria-label="Mois suivant"
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
              const isDisabled = !!min && day < min;
              const isToday = toIso(day) === toIso(new Date());
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => select(day)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md text-sm transition-colors",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isCurrentMonth && !isSelected && "hover:bg-muted",
                    isSelected && "bg-primary text-primary-foreground font-medium",
                    isDisabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
                    isToday && !isSelected && "border border-primary/40",
                  )}
                >
                  {day.getUTCDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
