import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useHoursRegister, usePeriodDefinitions } from "@/features/hours/hooks";
import { PeriodToolbar } from "@/features/hours/components/PeriodToolbar";
import { HoursTable } from "@/features/hours/components/HoursTable";
import { SummaryCard } from "@/features/hours/components/SummaryCard";
import { CentersModal } from "@/features/hours/components/CentersModal";
import { ApprovalModal } from "@/features/hours/components/ApprovalModal";

const DEFAULT_PERIOD = "2026-07";

export function HoursRegisterPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [isCentersOpen, setIsCentersOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  const definitionsQuery = usePeriodDefinitions();
  const register = useHoursRegister(period);

  function handlePeriodChange(nextPeriod: string) {
    if (register.dirty && !window.confirm("Tienes cambios sin guardar. ¿Deseas cambiar de período de todas formas? Se perderán los cambios.")) {
      return;
    }
    setPeriod(nextPeriod);
  }

  useEffect(() => {
    if (!definitionsQuery.data?.length) return;
    const stillExists = definitionsQuery.data.some((definition) => definition.period === period);
    if (!stillExists) {
      setPeriod(definitionsQuery.data[0].period);
    }
    // Solo debe reaccionar cuando cambia el catálogo de períodos disponible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionsQuery.data]);

  return (
    <AppShell>
      <nav aria-label="Ruta de navegación" className="mb-3">
        <ol className="flex items-center gap-2 text-sm text-ink-muted">
          <li>
            <button
              type="button"
              onClick={() => toast("El módulo \"Inicio\" se construirá en la siguiente etapa.")}
              className="hover:text-krontec-blue"
            >
              Inicio
            </button>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-medium text-ink">
            Registro de horas
          </li>
        </ol>
      </nav>

      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">
          Registro de horas
        </h1>
        <p className="mt-1.5 text-sm text-[#314460]">
          Registra las horas trabajadas en cada centro de costo para el período seleccionado.
        </p>
      </section>

      <PeriodToolbar
        period={period}
        onPeriodChange={handlePeriodChange}
        definitions={definitionsQuery.data ?? []}
        status={register.status}
        isSubmitted={register.isSubmitted}
        onManageCenters={() => setIsCentersOpen(true)}
        onCopyDay={register.copyPreviousDay}
        onCopyWeek={register.copyPreviousWeek}
        onCopyMonth={register.copyPreviousMonth}
        onExport={register.exportCsv}
      />

      {register.isLoading ? (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-10 text-center text-sm text-ink-muted shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          Cargando registro de horas…
        </div>
      ) : (
        <>
          <HoursTable
            days={register.days}
            centers={register.selectedCenters}
            hours={register.hours}
            observations={register.observations}
            activeDate={register.activeDate}
            isSubmitted={register.isSubmitted}
            getDayTotal={register.getDayTotal}
            getColumnTotal={register.getColumnTotal}
            registeredHours={register.registeredHours}
            onSetHour={register.setHour}
            onSetObservation={register.setObservation}
            onSetActiveDate={register.setActiveDate}
          />

          <SummaryCard
            expectedHours={register.expectedHours}
            registeredHours={register.registeredHours}
            remainingHours={register.remainingHours}
            progress={register.progress}
            deadline={register.periodDefinition?.deadline}
            isSubmitted={register.isSubmitted}
            dirty={register.dirty}
            isSaving={register.isSaving}
            isSubmitting={register.isSubmitting}
            onSave={register.save}
            onSubmit={() => setIsApprovalOpen(true)}
          />
        </>
      )}

      <CentersModal
        open={isCentersOpen}
        onOpenChange={setIsCentersOpen}
        allCenters={register.allCenters}
        selectedCenterIds={register.selectedCenterIds}
        onApply={register.applyCenters}
        isApplying={register.isApplyingCenters}
      />

      <ApprovalModal
        open={isApprovalOpen}
        onOpenChange={setIsApprovalOpen}
        remainingHours={register.remainingHours}
        isSubmitting={register.isSubmitting}
        onConfirm={() => {
          register.submit();
          setIsApprovalOpen(false);
        }}
      />
    </AppShell>
  );
}
