import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"

/** Variante d'Input avec une icône fixe à gauche (ex: téléphone, email) —
 * évite de retaper le positionnement `relative`/`absolute` à chaque usage. */
function IconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<"input"> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn("pl-10", className)} {...props} />
    </div>
  )
}

export { IconInput }
