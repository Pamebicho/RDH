import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, Download, Search, Target, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatCardMini } from "@/components/ui/StatCardMini";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";
import { diasRestantes, encontrarPeriodoActual, formatDateCl } from "@/utils/date";
import { usePeriodos } from "@/features/hours/hooks";
import { formatHours } from "@/features/hours/domain";
import {
  useDistribucionCC,
  useExportarDistribucionCC,
  type DistribucionTrabajador,
  type EstadoDistribucion,
} from "@/features/rrhh/hooks";

const ESTADO_ESTILOS: Record<EstadoDistribucion, string> = {
  CORRECTO: "text-[#0b9e57] bg-[#e8f8ef]",
  REVISAR: "text-[#a54e00] bg-[#fff0dc]",
  INCONSISTENCIA: "text-[#c2273d] bg-[#fdeaec]",
};

const ESTADO_LABELS: Record<EstadoDistribucion, string> = {
  CORRECTO: "Correcto",
  REVISAR: "Revisar",
  INCONSISTENCIA: "Inconsistencia",
};

function EstadoBadge({ estado }: { estado: EstadoDistribucion }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[30px] w-fit items-center justify-center rounded-control px-3 text-xs font-semibold",
        ESTADO_ESTILOS[estado],
      )}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}

function DetalleTrabajadorModal({
  trabajador,
  onClose,
}: {
  trabajador: DistribucionTrabajador | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(trabajador)}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={trabajador?.nombreCompleto ?? ""}
      description={
        trabajador
          ? `Total HH: ${formatHours(trabajador.totalHoras)} · Distribución: ${trabajador.porcentajeDistribuido.toFixed(2)}%`
          : undefined
      }
    >
      {trabajador ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Centro de Costo</th>
                <th className="px-3 py-2 font-semibold">Nombre</th>
                <th className="px-3 py-2 text-right font-semibold">HH</th>
                <th className="px-3 py-2 text-right font-semibold">% Distribución</th>
              </tr>
            </thead>
            <tbody>
              {trabajador.centrosCosto.map((cc) => (
                <tr key={cc.codigo} className="border-t border-[#e5eaf1]">
                  <td className="px-3 py-2 font-medium text-ink">{cc.codigo}</td>
                  <td className="px-3 py-2 text-ink-muted">{cc.nombre}</td>
                  <td className="px-3 py-2 text-right text-ink-muted">{formatHours(cc.horas)}</td>
                  <td className="px-3 py-2 text-right text-ink-muted">{cc.porcentaje.toFixed(2)}%</td>
                </tr>
              ))}
              {!trabajador.centrosCosto.length ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-ink-muted">
                    Sin horas asignadas a un centro de costo en este período.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#e5eaf1] font-semibold text-ink">
                <td className="px-3 py-2" colSpan={2}>
                  TOTAL
                </td>
                <td className="px-3 py-2 text-right">{formatHours(trabajador.horasConCC)}</td>
                <td className="px-3 py-2 text-right">{trabajador.porcentajeDistribuido.toFixed(2)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </Modal>
  );
}

export function RrhhDistribucionPage() {
  const periodosQuery = usePeriodos();
  const [periodoId, setPeriodoId] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<DistribucionTrabajador | null>(null);

  useEffect(() => {
    if (periodoId || !periodosQuery.data?.length) return;
    const actual = encontrarPeriodoActual(periodosQuery.data);
    if (actual) setPeriodoId(actual.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodosQuery.data]);

  const periodoSeleccionado = (periodosQuery.data ?? []).find((p) => p.id === periodoId);
  const distribucion = useDistribucionCC(periodoSeleccionado?.id);
  const exportar = useExportarDistribucionCC();

  const termino = busqueda.trim().toLowerCase();
  const trabajadoresFiltrados = distribucion.trabajadores.filter(
    (t) =>
      !termino || t.nombreCompleto.toLowerCase().includes(termino) || t.rut.toLowerCase().includes(termino),
  );

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">
          Distribución Centros de Costo — RRHH
        </h1>
        <p className="mt-1.5 text-sm text-[#314460]">
          Distribución porcentual de las horas de cada trabajador entre sus Centros de Costo, lista para exportar.
        </p>
      </section>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-krontec-blue">
                <CalendarDays className="h-5 w-5" aria-hidden />
              </span>
              {periodosQuery.isLoading ? (
                <span className="text-sm text-ink-muted">Cargando período…</span>
              ) : periodoSeleccionado ? (
                <div>
                  <span className="block text-sm font-bold text-ink">Período {periodoSeleccionado.nombre}</span>
                  <span className="block text-xs text-ink-muted">
                    {formatDateCl(periodoSeleccionado.fecha_inicio)} – {formatDateCl(periodoSeleccionado.fecha_fin)}
                    {" · "}
                    {(() => {
                      const dias = diasRestantes(periodoSeleccionado.fecha_fin);
                      if (dias < 0) return "Cerrado";
                      if (dias === 0) return "Cierra hoy";
                      return `Cierra en ${dias} ${dias === 1 ? "día" : "días"}`;
                    })()}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-ink-muted">No hay períodos configurados.</span>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="btn-outline min-h-[40px] w-full justify-center px-3 text-sm sm:w-auto sm:max-w-[240px]"
                  >
                    <span className="truncate">Ver otro período</span>
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-[1030] max-h-72 min-w-[220px] overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-[0_1rem_3rem_rgba(15,31,59,0.18)]"
                  >
                    {(periodosQuery.data ?? []).map((periodo) => (
                      <DropdownMenu.Item
                        key={periodo.id}
                        onSelect={() => setPeriodoId(periodo.id)}
                        className={cn(
                          "cursor-pointer rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-bg",
                          periodo.id === periodoId ? "font-semibold text-krontec-blue" : "text-ink",
                        )}
                      >
                        {periodo.nombre}
                      </DropdownMenu.Item>
                    ))}
                    {!periodosQuery.data?.length ? (
                      <p className="px-3 py-2.5 text-sm text-ink-muted">No hay períodos disponibles.</p>
                    ) : null}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <Button
                type="button"
                variant="outline"
                disabled={!periodoSeleccionado || !distribucion.trabajadores.length}
                isLoading={exportar.isPending}
                onClick={() =>
                  periodoSeleccionado &&
                  exportar.mutate({ periodo: periodoSeleccionado, trabajadores: distribucion.trabajadores })
                }
                className="min-h-[40px] w-full justify-center px-3 text-sm sm:w-auto"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                <span>Descargar CSV</span>
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardMini
              icon={Users}
              label="Trabajadores"
              value={String(distribucion.resumen.total)}
              isLoading={distribucion.isLoading}
            />
            <StatCardMini
              icon={CheckCircle2}
              label="Correctos"
              value={String(distribucion.resumen.correctos)}
              isLoading={distribucion.isLoading}
            />
            <StatCardMini
              icon={AlertTriangle}
              label="Por revisar"
              value={String(distribucion.resumen.revisar + distribucion.resumen.inconsistencia)}
              isLoading={distribucion.isLoading}
            />
            <StatCardMini icon={Target} label="Meta de distribución" value="100 %" isLoading={distribucion.isLoading} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <div className="border-b border-[#e5eaf1] p-4">
            <label htmlFor="rrhh-busqueda" className="mb-1 block text-xs font-medium text-[#51617a]">
              Buscar trabajador
            </label>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                id="rrhh-busqueda"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o RUT…"
                className="form-input pl-9"
              />
            </div>
          </div>

          {distribucion.isLoading ? (
            <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Trabajador</th>
                    <th className="px-4 py-3 font-semibold">RUT</th>
                    <th className="px-4 py-3 text-right font-semibold">Total HH</th>
                    <th className="px-4 py-3 text-right font-semibold">CC asociados</th>
                    <th className="px-4 py-3 text-right font-semibold">Distribución</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {trabajadoresFiltrados.map((trabajador) => (
                    <tr key={trabajador.trabajadorId} className="border-t border-[#e5eaf1] hover:bg-[#f8fbff]">
                      <td className="px-4 py-3 font-medium text-ink">{trabajador.nombreCompleto}</td>
                      <td className="px-4 py-3 text-ink-muted">{trabajador.rut}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">{formatHours(trabajador.totalHoras)}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">{trabajador.centrosCosto.length}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">
                        {trabajador.porcentajeDistribuido.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={trabajador.estado} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setTrabajadorSeleccionado(trabajador)}
                          className="btn-outline min-h-[32px] px-3 text-xs"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!trabajadoresFiltrados.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                        {busqueda
                          ? `No se encontraron trabajadores para "${busqueda}".`
                          : "No hay horas registradas en este período."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DetalleTrabajadorModal trabajador={trabajadorSeleccionado} onClose={() => setTrabajadorSeleccionado(null)} />
    </AppShell>
  );
}
