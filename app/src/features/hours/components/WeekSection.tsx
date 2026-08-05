import { useWeekPlanilla } from "../hooks";
import type { ColumnaRegistro } from "../domain";
import type { Semana } from "@/types/database.types";
import { formatDateCl } from "@/utils/date";
import { WeekTable } from "./WeekTable";
import { WeekSummary } from "./WeekSummary";

interface WeekSectionProps {
  trabajadorId: string | undefined;
  semana: Semana;
  columns: ColumnaRegistro[];
}

export function WeekSection({ trabajadorId, semana, columns }: WeekSectionProps) {
  const week = useWeekPlanilla(trabajadorId, semana, columns);

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5eaf1] px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Semana {semana.numero_semana}</h2>
          <p className="text-xs text-ink-muted">
            {formatDateCl(semana.fecha_inicio)} – {formatDateCl(semana.fecha_fin)}
          </p>
        </div>
      </header>

      {week.isLoading ? (
        <div className="p-6 text-center text-sm text-ink-muted">Cargando semana…</div>
      ) : (
        <>
          <div className="p-4">
            <WeekTable
              days={week.days}
              columns={columns}
              hours={week.hours}
              activeDate={week.activeDate}
              isSubmitted={week.isSubmitted}
              getDayTotal={week.getDayTotal}
              getColumnTotal={week.getColumnTotal}
              registeredHours={week.registeredHours}
              onSetHour={week.setHour}
              onSetActiveDate={week.setActiveDate}
            />
          </div>

          <WeekSummary
            estado={week.estado}
            expectedHours={week.expectedHours}
            registeredHours={week.registeredHours}
            remainingHours={week.remainingHours}
            totales={week.totales}
            isSubmitted={week.isSubmitted}
            dirty={week.dirty}
            isSaving={week.isSaving}
            isSubmitting={week.isSubmitting}
            onSave={week.save}
            onSubmit={week.submit}
            onExport={week.exportCsv}
          />
        </>
      )}
    </section>
  );
}
