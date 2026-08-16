import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PlanillaEstado } from "@/types/database.types";
import { formatHours, type TotalesPorCategoria } from "../domain";

interface PeriodStatusSummaryProps {
  estado: PlanillaEstado;
  expectedHours: number;
  registeredHours: number;
  remainingHours: number;
  totales: TotalesPorCategoria;
  isSubmitted: boolean;
  dirty: boolean;
}

export function PeriodStatusSummary({
  estado,
  expectedHours,
  registeredHours,
  remainingHours,
  totales,
  isSubmitted,
  dirty,
}: PeriodStatusSummaryProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <StatusBadge status={estado} />

      <span className="text-ink-muted">
        Esperadas: <strong className="text-ink">{formatHours(expectedHours)}</strong>
      </span>
      <span className="text-ink-muted">
        Registradas: <strong className="text-success">{formatHours(registeredHours)}</strong>
      </span>
      <span className="text-ink-muted">
        Restantes: <strong className="text-[#b45300]">{formatHours(remainingHours)}</strong>
      </span>
      {totales.extraordinarias > 0 ? (
        <span className="text-ink-muted">
          Extra: <strong className="text-ink">{formatHours(totales.extraordinarias)}</strong>
        </span>
      ) : null}
      {totales.ausencias > 0 ? (
        <span className="text-ink-muted">
          Ausencias: <strong className="text-ink">{formatHours(totales.ausencias)}</strong>
        </span>
      ) : null}
      {dirty && !isSubmitted ? <span className="text-[#a54e00]">Cambios sin guardar</span> : null}
    </div>
  );
}
