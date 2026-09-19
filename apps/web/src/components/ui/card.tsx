import * as React from "react"
import { cn } from "cn"

function Card({
  className,
  size = "default",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        // Dégradé très léger (pas de blanc plat) + ombre réelle plutôt
        // qu'un simple anneau de 1px — retour utilisateur explicite : le
        // panel se sentait plat, "template admin". `interactive` (opt-in,
        // jamais par défaut) ajoute une élévation au survol pour les
        // cartes qui représentent une action/un élément cliquable — pas
        // pour un panneau statique (formulaire, dialogue...) où "flotter"
        // au survol n'aurait pas de sens.
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl bg-gradient-to-b from-card to-card/95 py-(--card-spacing) text-sm text-card-foreground shadow-sm shadow-foreground/[0.04] ring-1 ring-foreground/[0.06] [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
        // `filter:drop-shadow` plutôt que `box-shadow` pour l'élévation au
        // survol : box-shadow force un repaint (et se retrouve de toute
        // façon rogné par l'`overflow-hidden` ci-dessus, contrairement à
        // drop-shadow) — transform/filter peuvent être accélérés par le
        // compositeur (retour utilisateur explicite sur la réactivité au
        // clic après l'ajout de ces micro-interactions).
        interactive &&
          "cursor-pointer transition-[transform,filter] duration-300 hover:-translate-y-1 hover:[filter:drop-shadow(0_12px_16px_color-mix(in_oklch,var(--foreground),transparent_88%))]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-2xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-2xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
