import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { usePeriodos, useSemanas, useColumnas } from "@/features/hours/hooks";
import { PeriodSelector } from "@/features/hours/components/PeriodSelector";
import { WeekSection } from "@/features/hours/components/WeekSection";

export function HoursRegisterPage() {
  const { trabajador } = useWorkforce();
  const [periodoId, setPeriodoId] = useState<string>("");

  const periodosQuery = usePeriodos();
  const semanasQuery = useSemanas(periodoId || undefined);
  const columnasInfo = useColumnas();

  useEffect(() => {
    if (!periodosQuery.data?.length) return;
    const stillExists = periodosQuery.data.some((periodo) => periodo.id === periodoId);
    if (!stillExists) {
      setPeriodoId(periodosQuery.data[0].id);
    }
    // Solo debe reaccionar cuando cambia el catálogo de períodos disponible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodosQuery.data]);

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
          Registra tus horas trabajadas semana a semana para el período seleccionado.
        </p>
      </section>

      <PeriodSelector periodoId={periodoId} onPeriodoChange={setPeriodoId} periodos={periodosQuery.data ?? []} />

      {!trabajador ? (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-10 text-center text-sm text-ink-muted shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          Cargando tu perfil…
        </div>
      ) : semanasQuery.isLoading || columnasInfo.isLoading ? (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-10 text-center text-sm text-ink-muted shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          Cargando semanas del período…
        </div>
      ) : (
        (semanasQuery.data ?? []).map((semana) => (
          <WeekSection key={semana.id} trabajadorId={trabajador.id} semana={semana} columns={columnasInfo.columnas} />
        ))
      )}
    </AppShell>
  );
}
