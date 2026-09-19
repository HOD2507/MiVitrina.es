"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  hint?: string;
  toggleAriaLabel: string;
  className?: string;
  /** Élément affiché à droite du label sur la même ligne (ex: lien "mot de passe oublié ?"). */
  labelSlot?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

/** Champ mot de passe avec un bouton "œil" pour révéler la saisie en clair
 * — demande explicite de l'utilisateur, pour pouvoir vérifier ce qu'on a
 * tapé avant de valider (surtout utile vu l'historique récent d'erreurs
 * de frappe dans ce formulaire). */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  required,
  minLength,
  hint,
  toggleAriaLabel,
  className,
  labelSlot,
  ref,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const hintId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      {labelSlot ? (
        <div className="flex items-center justify-between">
          <Label htmlFor={id}>{label}</Label>
          {labelSlot}
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type={revealed ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? hintId : undefined}
          className={`pr-10 ${className ?? ""}`}
        />
        {/* Bouton flottant à l'intérieur du champ (pas collé bord à bord) :
            plaqué contre l'angle arrondi de l'input, il masquait/déformait
            visuellement l'anneau de focus à cet endroit précis. */}
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-label={toggleAriaLabel}
          aria-pressed={revealed}
          className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {/* L'icône représente l'état actuel (ce que tu vois), pas l'action
              du clic : œil barré tant que c'est masqué, œil ouvert une fois
              révélé — sens inverse de la version précédente, corrigé sur retour utilisateur. */}
          {revealed ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
