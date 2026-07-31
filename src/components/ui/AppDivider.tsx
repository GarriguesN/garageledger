import { cn } from "./cn";

export interface AppDividerProps {
  /** Anula el padding lateral del contenedor para llegar de borde a borde. */
  full?: boolean;
  className?: string;
}

export default function AppDivider({ full = false, className }: AppDividerProps) {
  return (
    <hr
      className={cn("border-0 border-t border-border", full && "-mx-4", className)}
    />
  );
}
