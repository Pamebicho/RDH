import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useCumplimientoSemanal } from "@/features/approvals/hooks";
import { usePeriodos } from "@/features/hours/hooks";
import { encontrarPeriodoActual, formatDateCl } from "@/utils/date";

/**
 * Solo visible para SUPER_ADMIN (ver ApprovalsPage): un Administrador normal no puede ver, por
 * RLS, a un trabajador que no registró absolutamente nada en ninguno de sus proyectos, así que
 * esta vista quedaría incompleta para ese rol.
 */
export function SinRegistrarTab() {
  const [periodoId, setPeriodoId] = useState("");
  const periodosDisponiblesQuery = usePeriodos();
  const { semanas, trabajadores, isLoading } = useCumplimientoSemanal(periodoId || undefined);

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
          <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
        ) : !semanas.length ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Todavía no comienza ninguna semana de este período.
          </div>
        ) : !trabajadores.length ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Todos los trabajadores están al día con sus horas en este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Trabajador</th>
                  {semanas.map((semana) => (
                    <th key={semana.id} className="px-3 py-3 text-center font-semibold">
                      Semana {semana.numero_semana}
                      <span className="block font-normal normal-case text-[#8294ab]">
                        {formatDateCl(semana.fecha_inicio)}–{formatDateCl(semana.fecha_fin)}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold">Semanas sin registrar</th>
                </tr>
              </thead>
              <tbody>
                {trabajadores.map((trabajador) => (
                  <tr key={trabajador.trabajadorId} className="border-t border-[#e5eaf1] hover:bg-[#f8fbff]">
                    <td className="px-4 py-3 font-medium text-ink">{trabajador.nombre}</td>
                    {trabajador.semanas.map((semana) => (
                      <td key={semana.semanaId} className="px-3 py-3 text-center">
                        {semana.registro ? (
                          <Check className="mx-auto h-4 w-4 text-success" aria-label="Registró horas" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-danger" aria-label="No registró horas" />
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right font-semibold text-danger">
                      {trabajador.semanasSinRegistrar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
