import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "default" | "accent";
}

/** Carte indicateur pour les tableaux de bord — valeur réelle, pas de fioriture inutile. */
export function StatCard({ icon: Icon, label, value, tone = "default" }: StatCardProps) {
  return (
    <Card className="hover-lift">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span
          className={
            tone === "accent"
              ? "flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
              : "flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          }
        >
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}
