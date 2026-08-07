import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { usePeriodos } from "@/features/hours/hooks";
import { formatHours } from "@/features/hours/domain";
import { useReportePeriodo } from "@/features/reports/hooks";

export function ReportsPage() {
  const [periodoId, setPeriodoId] = useState("");
  const periodosQuery = usePeriodos();
  const { filas, isLoading } = useReportePeriodo(periodoId || undefined);

  useEffect(() => {
    if (!periodosQuery.data?.length) return;
    const stillExists = periodosQuery.data.some((periodo) => periodo.id === periodoId);
    if (!stillExists) setPeriodoId(periodosQuery.data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodosQuery.data]);

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">Reportes</h1>
        <p className="mt-1.5 text-sm text-[#314460]">
          Horas por trabajador según tu alcance de lectura asignado.
        </p>
      </section>

      <div className="mb-4 flex min-h-[64px] items-center gap-3 rounded-xl border border-[#dfe5ee] bg-white px-4 py-3 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-[#51617a]">Período</span>
          <select
            value={periodoId}
            onChange={(event) => setPeriodoId(event.target.value)}
            aria-label="Seleccionar período"
            className="mt-0.5 w-full border-0 bg-transparent text-lg font-bold text-[#0c1e3c] focus:outline-none focus:ring-0"
          >
            {(periodosQuery.data ?? []).map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Cargando reporte…</div>
        ) : !filas.length ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            No hay datos visibles para tu alcance en este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Trabajador</th>
                  <th className="px-4 py-3 text-right font-semibold">Ordinarias</th>
                  <th className="px-4 py-3 text-right font-semibold">Extra</th>
                  <th className="px-4 py-3 text-right font-semibold">Ausencias</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Enviadas</th>
                  <th className="px-4 py-3 text-right font-semibold">Aprobadas</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.trabajadorId} className="border-t border-[#e5eaf1]">
                    <td className="px-4 py-3 font-medium text-ink">{fila.nombre}</td>
                    <td className="px-4 py-3 text-right">{formatHours(fila.ordinarias)}</td>
                    <td className="px-4 py-3 text-right">{formatHours(fila.extraordinarias)}</td>
                    <td className="px-4 py-3 text-right">{formatHours(fila.ausencias)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatHours(fila.total)}</td>
                    <td className="px-4 py-3 text-right text-ink-muted">{fila.planillasEnviadas}</td>
                    <td className="px-4 py-3 text-right text-ink-muted">{fila.planillasAprobadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
