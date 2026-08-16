import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import {
  usePeriodos,
  useSemanas,
  useColumnas,
  useProyectosSeleccionados,
  useUpdateProyectosSeleccionados,
  useExportarPeriodo,
  usePeriodoPlanilla,
} from "@/features/hours/hooks";
import { PeriodSelector } from "@/features/hours/components/PeriodSelector";
import { PeriodoSection } from "@/features/hours/components/PeriodoSection";
import { ProjectsModal } from "@/features/hours/components/ProjectsModal";

export function HoursRegisterPage() {
  const navigate = useNavigate();
  const { trabajador } = useWorkforce();
  const [periodoId, setPeriodoId] = useState<string>("");
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);

  const periodosQuery = usePeriodos();
  const semanasQuery = useSemanas(periodoId || undefined);
  const proyectosSeleccionadosQuery = useProyectosSeleccionados(trabajador?.id, periodoId || undefined);
  const columnasInfo = useColumnas(proyectosSeleccionadosQuery.data);
  const updateProyectosSeleccionados = useUpdateProyectosSeleccionados(trabajador?.id, periodoId || undefined);

  const periodoActual = periodosQuery.data?.find((periodo) => periodo.id === periodoId);
  const exportarPeriodo = useExportarPeriodo(
    trabajador?.id,
    periodoActual,
    semanasQuery.data ?? [],
    columnasInfo.columnas,
  );
  const periodoPlanilla = usePeriodoPlanilla(trabajador?.id, periodoActual, semanasQuery.data ?? [], columnasInfo.columnas);

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
            <button type="button" onClick={() => navigate("/inicio")} className="hover:text-krontec-blue">
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
          Registra tus horas trabajadas para todo el período seleccionado.
        </p>
      </section>

      <PeriodSelector
        periodoId={periodoId}
        onPeriodoChange={setPeriodoId}
        periodos={periodosQuery.data ?? []}
        onManageProjects={() => {
          void columnasInfo.refetchProyectos();
          setProjectsModalOpen(true);
        }}
        onExportPeriodo={() => exportarPeriodo.mutate()}
        isExporting={exportarPeriodo.isPending}
        onSave={periodoPlanilla.save}
        onSubmit={periodoPlanilla.submit}
        isSaving={periodoPlanilla.isSaving}
        isSubmitting={periodoPlanilla.isSubmitting}
        canEdit={Boolean(periodoActual) && !periodoPlanilla.isSubmitted}
        estado={periodoPlanilla.estado}
        expectedHours={periodoPlanilla.expectedHours}
        registeredHours={periodoPlanilla.registeredHours}
        remainingHours={periodoPlanilla.remainingHours}
        totales={periodoPlanilla.totales}
        isSubmitted={periodoPlanilla.isSubmitted}
        dirty={periodoPlanilla.dirty}
      />

      {!trabajador ? (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-10 text-center text-sm text-ink-muted shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          Cargando tu perfil…
        </div>
      ) : semanasQuery.isLoading || columnasInfo.isLoading ? (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-10 text-center text-sm text-ink-muted shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          Cargando el período…
        </div>
      ) : periodoActual ? (
        <PeriodoSection periodoPlanilla={periodoPlanilla} columns={columnasInfo.columnas} />
      ) : (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-10 text-center text-sm text-ink-muted shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          Selecciona un período.
        </div>
      )}

      <ProjectsModal
        open={projectsModalOpen}
        onOpenChange={setProjectsModalOpen}
        proyectosDisponibles={columnasInfo.proyectosDisponibles}
        proyectosSeleccionadosIds={proyectosSeleccionadosQuery.data ?? []}
        isSaving={updateProyectosSeleccionados.isPending}
        onSave={(proyectoIds) => {
          updateProyectosSeleccionados.mutate(proyectoIds, {
            onSuccess: () => setProjectsModalOpen(false),
          });
        }}
      />
    </AppShell>
  );
}
