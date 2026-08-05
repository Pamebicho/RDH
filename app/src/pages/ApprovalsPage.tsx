import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { usePlanillasPendientes, type PlanillaPendiente } from "@/features/approvals/hooks";
import { ApprovalDetailModal } from "@/features/approvals/components/ApprovalDetailModal";
import { formatHours } from "@/features/hours/domain";
import { formatDateCl } from "@/utils/date";

export function ApprovalsPage() {
  const { trabajador } = useWorkforce();
  const { planillas, isLoading } = usePlanillasPendientes();
  const [seleccionada, setSeleccionada] = useState<PlanillaPendiente | null>(null);

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">Aprobaciones</h1>
        <p className="mt-1.5 text-sm text-[#314460]">
          Planillas semanales enviadas por trabajadores de tus proyectos, pendientes de revisión.
        </p>
      </section>

      <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Cargando planillas pendientes…</div>
        ) : !planillas.length ? (
          <div className="p-8 text-center text-sm text-ink-muted">No hay planillas pendientes de aprobación.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Trabajador</th>
                <th className="px-4 py-3 font-semibold">Semana</th>
                <th className="px-4 py-3 font-semibold">Período</th>
                <th className="px-4 py-3 text-right font-semibold">Ordinarias</th>
                <th className="px-4 py-3 text-right font-semibold">Extra</th>
                <th className="px-4 py-3 text-right font-semibold">Ausencias</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {planillas.map((planilla) => (
                <tr key={planilla.id} className="border-t border-[#e5eaf1] hover:bg-[#f8fbff]">
                  <td className="px-4 py-3 font-medium text-ink">{planilla.trabajadorNombre}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    Semana {planilla.semanaNumero} · {formatDateCl(planilla.semanaFechaInicio)} –{" "}
                    {formatDateCl(planilla.semanaFechaFin)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{planilla.periodoNombre}</td>
                  <td className="px-4 py-3 text-right">{formatHours(planilla.totalOrdinarias)}</td>
                  <td className="px-4 py-3 text-right">{formatHours(planilla.totalExtraordinarias)}</td>
                  <td className="px-4 py-3 text-right">{formatHours(planilla.totalAusencias)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSeleccionada(planilla)}
                      className="btn-outline min-h-[36px] px-3 text-xs"
                    >
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ApprovalDetailModal
        planilla={seleccionada}
        administradorId={trabajador?.id}
        onClose={() => setSeleccionada(null)}
      />
    </AppShell>
  );
}
