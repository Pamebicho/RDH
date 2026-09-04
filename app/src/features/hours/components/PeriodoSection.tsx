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
          {periodoPlanilla.comentarioDevolucion ? (
            <div className="mx-4 mt-4 rounded-control border border-[#f2c894] bg-[#fff0dc] p-3 text-sm text-[#7a3d00]">
              <p className="font-semibold">El administrador devolvió este período para corrección</p>
              <p className="mt-1">{periodoPlanilla.comentarioDevolucion}</p>
            </div>
          ) : null}

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
