import { CalendarDays, Copy, FileSpreadsheet, Grid3x3, CalendarClock } from "lucide-react";
import type { PeriodDefinition, PeriodStatus } from "@/types/database.types";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface PeriodToolbarProps {
  period: string;
  onPeriodChange: (period: string) => void;
  definitions: PeriodDefinition[];
  status: PeriodStatus;
  isSubmitted: boolean;
  onManageCenters: () => void;
  onCopyDay: () => void;
  onCopyWeek: () => void;
  onCopyMonth: () => void;
  onExport: () => void;
}

export function PeriodToolbar({
  period,
  onPeriodChange,
  definitions,
  status,
  isSubmitted,
  onManageCenters,
  onCopyDay,
  onCopyWeek,
  onCopyMonth,
  onExport,
}: PeriodToolbarProps) {
  return (
    <section
      aria-label="Configuración del período"
      className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[255px_185px_minmax(0,1fr)]"
    >
      <div className="flex min-h-[88px] items-center gap-3 rounded-xl border border-[#dfe5ee] bg-white px-4 py-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        <CalendarDays className="h-7 w-7 shrink-0 text-[#0764e1]" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-[#51617a]">Período</span>
          <select
            value={period}
            onChange={(event) => onPeriodChange(event.target.value)}
            aria-label="Seleccionar período"
            className="mt-0.5 w-full border-0 bg-transparent text-lg font-bold text-[#0c1e3c] focus:outline-none focus:ring-0"
          >
            {definitions.map((definition) => (
              <option key={definition.period} value={definition.period}>
                {definition.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex min-h-[88px] items-center rounded-xl border border-[#dfe5ee] bg-white px-4 py-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        <div>
          <span className="block text-xs font-medium text-[#51617a]">Estado del período</span>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-2 rounded-xl border border-[#dfe5ee] bg-white p-3 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)] xl:justify-end">
        <button
          type="button"
          onClick={onManageCenters}
          disabled={isSubmitted}
          className="btn-outline min-h-[44px] px-3.5"
        >
          <Grid3x3 className="h-4 w-4" aria-hidden />
          <span>Seleccionar centros</span>
        </button>
        <button
          type="button"
          onClick={onCopyDay}
          disabled={isSubmitted}
          className="btn-outline min-h-[44px] px-3.5"
        >
          <Copy className="h-4 w-4" aria-hidden />
          <span>Copiar día anterior</span>
        </button>
        <button
          type="button"
          onClick={onCopyWeek}
          disabled={isSubmitted}
          className="btn-outline min-h-[44px] px-3.5"
        >
          <CalendarClock className="h-4 w-4" aria-hidden />
          <span>Copiar semana</span>
        </button>
        <button
          type="button"
          onClick={onCopyMonth}
          disabled={isSubmitted}
          className="btn-outline min-h-[44px] px-3.5"
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          <span>Copiar mes anterior</span>
        </button>
        <button type="button" onClick={onExport} className="btn-outline min-h-[44px] px-3.5">
          <FileSpreadsheet className="h-4 w-4 text-success" aria-hidden />
          <span>Exportar Excel</span>
        </button>
      </div>
    </section>
  );
}
