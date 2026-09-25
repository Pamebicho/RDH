import { useState } from "react";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { usePeriodosPendientes, type PeriodoPendiente } from "@/features/approvals/hooks";
import { formatHours } from "@/features/hours/domain";
import { formatDateCl } from "@/utils/date";
import { ApprovalDetailModal } from "./ApprovalDetailModal";

export function PendientesTab() {
  const { trabajador } = useWorkforce();
  const { periodos, isLoading } = usePeriodosPendientes();
  const [seleccionado, setSeleccionado] = useState<PeriodoPendiente | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Cargando períodos pendientes…</div>
        ) : !periodos.length ? (
          <div className="p-8 text-center text-sm text-ink-muted">No hay períodos pendientes de aprobación.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Trabajador</th>
                  <th className="px-4 py-3 font-semibold">Período</th>
                  <th className="px-4 py-3 text-right font-semibold">Ordinarias</th>
                  <th className="px-4 py-3 text-right font-semibold">Extra</th>
                  <th className="px-4 py-3 text-right font-semibold">Ausencias</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {periodos.map((periodo) => (
                  <tr
                    key={`${periodo.trabajadorId}|${periodo.periodoId}`}
                    className="border-t border-[#e5eaf1] hover:bg-[#f8fbff]"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{periodo.trabajadorNombre}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {periodo.periodoNombre} · {formatDateCl(periodo.periodoFechaInicio)} –{" "}
                      {formatDateCl(periodo.periodoFechaFin)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatHours(periodo.totalOrdinarias)}</td>
                    <td className="px-4 py-3 text-right">{formatHours(periodo.totalExtraordinarias)}</td>
                    <td className="px-4 py-3 text-right">{formatHours(periodo.totalAusencias)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSeleccionado(periodo)}
                        className="btn-outline min-h-[36px] px-3 text-xs"
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ApprovalDetailModal
        periodo={seleccionado}
        administradorId={trabajador?.id}
        onClose={() => setSeleccionado(null)}
      />
    </>
  );
}
