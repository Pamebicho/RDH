import type { usePeriodoPlanilla } from "../hooks";
import type { ColumnaRegistro } from "../domain";
import { WeekTable } from "./WeekTable";
import { WeekSummary } from "./WeekSummary";

interface PeriodoSectionProps {
  periodoPlanilla: ReturnType<typeof usePeriodoPlanilla>;
  columns: ColumnaRegistro[];
}

export function PeriodoSection({ periodoPlanilla, columns }: PeriodoSectionProps) {
  return (
    <section className="mb-4 rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      {periodoPlanilla.isLoading ? (
        <div className="p-6 text-center text-sm text-ink-muted">Cargando período…</div>
      ) : (
        <>
          <WeekTable
            days={periodoPlanilla.days}
            columns={columns}
            hours={periodoPlanilla.hours}
            activeDate={periodoPlanilla.activeDate}
            isSubmitted={periodoPlanilla.isSubmitted}
            getDayTotal={periodoPlanilla.getDayTotal}
            getColumnTotal={periodoPlanilla.getColumnTotal}
            registeredHours={periodoPlanilla.registeredHours}
            onSetHour={periodoPlanilla.setHour}
            onSetActiveDate={periodoPlanilla.setActiveDate}
          />

          <WeekSummary
            estado={periodoPlanilla.estado}
            expectedHours={periodoPlanilla.expectedHours}
            registeredHours={periodoPlanilla.registeredHours}
            remainingHours={periodoPlanilla.remainingHours}
            totales={periodoPlanilla.totales}
            isSubmitted={periodoPlanilla.isSubmitted}
            dirty={periodoPlanilla.dirty}
          />
        </>
      )}
    </section>
  );
}
