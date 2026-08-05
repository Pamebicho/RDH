import { CalendarDays } from "lucide-react";
import type { Periodo } from "@/types/database.types";

interface PeriodSelectorProps {
  periodoId: string;
  onPeriodoChange: (periodoId: string) => void;
  periodos: Periodo[];
}

export function PeriodSelector({ periodoId, onPeriodoChange, periodos }: PeriodSelectorProps) {
  return (
    <section aria-label="Configuración del período" className="mb-4">
      <div className="flex min-h-[64px] items-center gap-3 rounded-xl border border-[#dfe5ee] bg-white px-4 py-3 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        <CalendarDays className="h-6 w-6 shrink-0 text-[#0764e1]" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-[#51617a]">Período</span>
          <select
            value={periodoId}
            onChange={(event) => onPeriodoChange(event.target.value)}
            aria-label="Seleccionar período"
            className="mt-0.5 w-full border-0 bg-transparent text-lg font-bold text-[#0c1e3c] focus:outline-none focus:ring-0"
          >
            {periodos.map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
