import type { PlanillaEstado } from "@/types/database.types";
import type { TotalesPorCategoria } from "../domain";
import { PeriodStatusSummary } from "./PeriodStatusSummary";

interface WeekSummaryProps {
  estado: PlanillaEstado;
  expectedHours: number;
  registeredHours: number;
  remainingHours: number;
  totales: TotalesPorCategoria;
  isSubmitted: boolean;
  dirty: boolean;
}

export function WeekSummary(props: WeekSummaryProps) {
  return (
    <div className="rounded-b-xl border-t border-[#e3e8f0] bg-[#fbfcfe] px-4 py-3.5">
      <PeriodStatusSummary {...props} />
    </div>
  );
}
