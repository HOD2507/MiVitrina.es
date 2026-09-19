import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Plus de "ring" (halo en box-shadow) séparé du bord : deux formes
        // arrondies superposées (le bord + le halo) pouvaient légèrement
        // se désaligner selon le navigateur/zoom, et donnaient l'effet de
        // bord "coupé"/mal ajusté remonté plusieurs fois par l'utilisateur.
        // Un seul bord, épaisseur fixe (2px, jamais changée), qui ne fait
        // que changer de couleur au focus/erreur — aucune forme à aligner
        // avec une autre, donc plus rien à désaligner.
        // `bg-muted/40` au repos (pas de blanc pur) -> `bg-background` net
        // dès qu'on écrit : un champ vide se distingue du fond de la page
        // sans avoir l'air désactivé, et redevient parfaitement lisible en saisie.
        "h-11 w-full min-w-0 appearance-none rounded-lg border-2 border-input bg-muted/40 px-3.5 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/20 dark:focus-visible:bg-input/40 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/70",
        className
      )}
      {...props}
    />
  )
}

export { Input }
