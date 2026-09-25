import { useEffect, useState } from "react";
import { usePeriodosEnCurso, type PeriodoEnCurso } from "@/features/approvals/hooks";
import { usePeriodos } from "@/features/hours/hooks";
import { formatHours } from "@/features/hours/domain";
import { encontrarPeriodoActual } from "@/utils/date";
import { ApprovalDetailModal } from "./ApprovalDetailModal";

/** Vista de solo lectura: horas que un trabajador va guardando día a día antes de enviarlas
 * (BORRADOR), o que devolvieron para corrección y está reeditando (DEVUELTA). Sin acciones de
 * aprobar/devolver — solo para ver el progreso. */
export function EnProgresoTab() {
  const [periodoId, setPeriodoId] = useState("");
  const periodosDisponiblesQuery = usePeriodos();
  const { periodos, isLoading } = usePeriodosEnCurso(periodoId || undefined);
  const [seleccionado, setSeleccionado] = useState<PeriodoEnCurso | null>(null);

  useEffect(() => {
    if (!periodosDisponiblesQuery.data?.length) return;
    const stillExists = periodosDisponiblesQuery.data.some((periodo) => periodo.id === periodoId);
    if (!stillExists) {
      const actual = encontrarPeriodoActual(periodosDisponiblesQuery.data);
      if (actual) setPeriodoId(actual.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodosDisponiblesQuery.data]);

  return (
    <>
      <div className="mb-4 flex min-h-[64px] items-center gap-3 rounded-xl border border-[#dfe5ee] bg-white px-4 py-3 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-[#51617a]">Período</span>
          <select
            value={periodoId}
            onChange={(event) => setPeriodoId(event.target.value)}
            aria-label="Seleccionar período"
            className="mt-0.5 w-full border-0 bg-transparent text-lg font-bold text-[#0c1e3c] focus:outline-none focus:ring-0"
          >
            {(periodosDisponiblesQuery.data ?? []).map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Cargando períodos en progreso…</div>
        ) : !periodos.length ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            No hay trabajadores con horas en progreso en este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Trabajador</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
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
                    <td className="px-4 py-3">
                      <span
                        className={
                          periodo.enCorreccion
                            ? "rounded-full bg-[#fff0dc] px-2.5 py-1 text-xs font-medium text-[#7a3d00]"
                            : "rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-medium text-[#3548a8]"
                        }
                      >
                        {periodo.enCorreccion ? "En corrección" : "En progreso"}
                      </span>
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
                        Ver
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
        administradorId={undefined}
        onClose={() => setSeleccionado(null)}
        readOnly
      />
    </>
  );
}
