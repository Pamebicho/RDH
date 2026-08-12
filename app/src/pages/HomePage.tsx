import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Clock,
  Download,
  Grid3x3,
  Layers,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatCardMini } from "@/components/ui/StatCardMini";
import { cn } from "@/utils/cn";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { usePeriodos } from "@/features/hours/hooks";
import { formatHours } from "@/features/hours/domain";
import {
  useExportarResumenPeriodo,
  useResumenPeriodo,
  useResumenSuperAdmin,
  type CentroCostoHoras,
  type ClienteAreaHoras,
  type ParetoPunto,
} from "@/features/home/hooks";
import { diasRestantes, encontrarPeriodoActual, formatDateCl } from "@/utils/date";

function StatCard({ icon: Icon, label, value, isLoading }: { icon: typeof Users; label: string; value: number; isLoading: boolean }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-krontec-blue">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <span className="block text-2xl font-extrabold leading-tight text-[#0d1e3b]">
          {isLoading ? "…" : value}
        </span>
        <span className="block text-xs text-ink-muted">{label}</span>
      </div>
    </div>
  );
}

function EstadoGrafico({ isLoading, vacio }: { isLoading: boolean; vacio: boolean }) {
  if (isLoading) {
    return <div className="flex h-56 items-center justify-center text-sm text-ink-muted">Cargando…</div>;
  }
  if (vacio) {
    return (
      <div className="flex h-56 items-center justify-center text-center text-sm text-ink-muted">
        Todavía no hay horas registradas en este período.
      </div>
    );
  }
  return null;
}

/** Barras horizontales ordenadas de mayor a menor, para distribución por Cliente/Área o Top 10 CC. */
function GraficoBarrasHorizontales({
  datos,
  isLoading,
}: {
  datos: { label: string; sublabel?: string; horas: number }[];
  isLoading: boolean;
}) {
  if (isLoading || !datos.length) {
    return <EstadoGrafico isLoading={isLoading} vacio={!datos.length} />;
  }

  const altura = Math.max(220, datos.length * 34);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#51617a" }} axisLine={{ stroke: "#dfe5ee" }} tickLine={false} />
        <YAxis
          dataKey="label"
          type="category"
          width={130}
          tick={{ fontSize: 11, fill: "#51617a" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`${formatHours(Number(value))} h`, "Horas"]}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.sublabel ?? label}
          contentStyle={{ borderRadius: 8, borderColor: "#dfe5ee", fontSize: 12 }}
        />
        <Bar dataKey="horas" fill="#0868ee" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Gráfico de Pareto: barras de horas por Cliente/Área + línea de % acumulado, con referencia en 80%. */
function GraficoPareto({ datos, isLoading }: { datos: ParetoPunto[]; isLoading: boolean }) {
  if (isLoading || !datos.length) {
    return <EstadoGrafico isLoading={isLoading} vacio={!datos.length} />;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={datos} margin={{ top: 8, right: 16, left: 0, bottom: 56 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" vertical={false} />
        <XAxis
          dataKey="clienteArea"
          tick={{ fontSize: 10, fill: "#51617a" }}
          axisLine={{ stroke: "#dfe5ee" }}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
          height={70}
        />
        <YAxis yAxisId="horas" tick={{ fontSize: 11, fill: "#51617a" }} axisLine={false} tickLine={false} width={44} />
        <YAxis
          yAxisId="porcentaje"
          orientation="right"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "#51617a" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          formatter={(value, name) =>
            name === "porcentajeAcumulado"
              ? [`${Number(value).toFixed(1)}%`, "Acumulado"]
              : [`${formatHours(Number(value))} h`, "Horas"]
          }
          contentStyle={{ borderRadius: 8, borderColor: "#dfe5ee", fontSize: 12 }}
        />
        <Bar yAxisId="horas" dataKey="horas" fill="#0868ee" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="porcentaje"
          type="monotone"
          dataKey="porcentajeAcumulado"
          stroke="#e05555"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <ReferenceLine
          yAxisId="porcentaje"
          y={80}
          stroke="#94a3b8"
          strokeDasharray="4 4"
          label={{ value: "80%", position: "right", fontSize: 11, fill: "#51617a" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function TablaClienteArea({ datos, isLoading }: { datos: ClienteAreaHoras[]; isLoading: boolean }) {
  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#fbfcfe] text-xs text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Cliente/Área</th>
            <th className="px-4 py-2.5 text-right font-semibold">Horas</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-ink-muted">
                Cargando…
              </td>
            </tr>
          ) : datos.length ? (
            datos.map((item) => (
              <tr key={item.clienteArea} className="border-t border-[#e5eaf1]">
                <td className="px-4 py-2.5 text-ink">{item.clienteArea}</td>
                <td className="px-4 py-2.5 text-right text-ink-muted">{formatHours(item.horas)} h</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-ink-muted">
                Sin datos para este período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TablaCentrosCosto({ datos, isLoading }: { datos: CentroCostoHoras[]; isLoading: boolean }) {
  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#fbfcfe] text-xs text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Código</th>
            <th className="px-4 py-2.5 font-semibold">Nombre</th>
            <th className="px-4 py-2.5 text-right font-semibold">Horas</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-ink-muted">
                Cargando…
              </td>
            </tr>
          ) : datos.length ? (
            datos.map((item) => (
              <tr key={item.codigo} className="border-t border-[#e5eaf1]">
                <td className="px-4 py-2.5 font-medium text-ink">{item.codigo}</td>
                <td className="px-4 py-2.5 text-ink-muted">{item.nombre}</td>
                <td className="px-4 py-2.5 text-right text-ink-muted">{formatHours(item.horas)} h</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-ink-muted">
                Sin datos para este período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const resumen = useResumenSuperAdmin();
  const periodosQuery = usePeriodos();
  const exportarPeriodo = useExportarResumenPeriodo();
  const [periodoId, setPeriodoId] = useState<string>("");

  useEffect(() => {
    if (periodoId || !periodosQuery.data?.length) return;
    const actual = encontrarPeriodoActual(periodosQuery.data);
    if (actual) setPeriodoId(actual.id);
    // Solo debe fijar el período por defecto una vez que llegan los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodosQuery.data]);

  const periodoSeleccionado = (periodosQuery.data ?? []).find((p) => p.id === periodoId);
  const resumenPeriodo = useResumenPeriodo(periodoSeleccionado?.id);

  const top10CentrosCosto = resumenPeriodo.centrosCostoDetalle
    .slice(0, 10)
    .map((item) => ({ label: item.codigo, sublabel: item.nombre, horas: item.horas }));
  const distribucionClienteArea = resumenPeriodo.clienteAreaDetalle.map((item) => ({
    label: item.clienteArea,
    horas: item.horas,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard icon={Users} label="Trabajadores activos" value={resumen.trabajadoresActivos} isLoading={resumen.isLoading} />
        <StatCard
          icon={CheckCircle2}
          label="Planillas pendientes de aprobación"
          value={resumen.planillasPendientes}
          isLoading={resumen.isLoading}
        />
        <StatCard icon={Grid3x3} label="Centros de costo activos" value={resumen.centrosCostoActivos} isLoading={resumen.isLoading} />
      </div>

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
                <span className="block text-sm font-bold text-ink">Resumen HH — {periodoSeleccionado.nombre}</span>
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
              disabled={!periodoSeleccionado}
              isLoading={exportarPeriodo.isPending}
              onClick={() => periodoSeleccionado && exportarPeriodo.mutate(periodoSeleccionado)}
              className="min-h-[40px] w-full justify-center px-3 text-sm sm:w-auto"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              <span>Descargar CSV</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardMini
            icon={Clock}
            label="Horas registradas"
            value={`${formatHours(resumenPeriodo.totalHoras)} h`}
            isLoading={resumenPeriodo.isLoading}
          />
          <StatCardMini
            icon={UserCheck}
            label="Trabajadores"
            value={String(resumenPeriodo.trabajadoresConHoras)}
            isLoading={resumenPeriodo.isLoading}
          />
          <StatCardMini
            icon={Layers}
            label="CC utilizados"
            value={String(resumenPeriodo.ccUtilizados)}
            isLoading={resumenPeriodo.isLoading}
          />
          <StatCardMini
            icon={CircleOff}
            label="CC sin movimiento"
            value={String(resumenPeriodo.ccSinMovimiento)}
            isLoading={resumenPeriodo.isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <h2 className="mb-1 text-sm font-bold text-ink">Distribución de HH por Cliente/Área</h2>
          <p className="mb-2 text-xs text-ink-muted">
            {periodoSeleccionado ? `Período ${periodoSeleccionado.nombre}` : "Sin período seleccionado"}
          </p>
          <GraficoBarrasHorizontales datos={distribucionClienteArea} isLoading={resumenPeriodo.isLoading} />
        </div>

        <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <h2 className="mb-1 text-sm font-bold text-ink">Top 10 Centros de Costo</h2>
          <p className="mb-2 text-xs text-ink-muted">
            {periodoSeleccionado ? `Período ${periodoSeleccionado.nombre}` : "Sin período seleccionado"}
          </p>
          <GraficoBarrasHorizontales datos={top10CentrosCosto} isLoading={resumenPeriodo.isLoading} />
        </div>
      </div>

      <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        <h2 className="mb-1 text-sm font-bold text-ink">Concentración de HH</h2>
        <p className="mb-2 text-xs text-ink-muted">
          Barras: horas por Cliente/Área · Línea: porcentaje acumulado, referencia en 80%.
        </p>
        <GraficoPareto datos={resumenPeriodo.paretoData} isLoading={resumenPeriodo.isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <h2 className="border-b border-[#e5eaf1] px-4 py-3 text-sm font-bold text-ink">Detalle por Cliente/Área</h2>
          <TablaClienteArea datos={resumenPeriodo.clienteAreaDetalle} isLoading={resumenPeriodo.isLoading} />
        </div>
        <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <h2 className="border-b border-[#e5eaf1] px-4 py-3 text-sm font-bold text-ink">Detalle por Centro de Costo</h2>
          <TablaCentrosCosto datos={resumenPeriodo.centrosCostoDetalle} isLoading={resumenPeriodo.isLoading} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => navigate("/aprobaciones")} className="btn-outline min-h-[42px] px-3 text-sm">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Ver aprobaciones
        </button>
        <button type="button" onClick={() => navigate("/administracion")} className="btn-outline min-h-[42px] px-3 text-sm">
          <Users className="h-4 w-4" aria-hidden />
          Personas y roles
        </button>
        <button type="button" onClick={() => navigate("/administracion")} className="btn-outline min-h-[42px] px-3 text-sm">
          <Settings className="h-4 w-4" aria-hidden />
          Configuración
        </button>
      </div>
    </div>
  );
}

export function HomePage() {
  const { hasRole } = useWorkforce();

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">Inicio</h1>
        <p className="mt-1.5 text-sm text-[#314460]">Resumen general del sistema.</p>
      </section>

      {hasRole("SUPER_ADMIN") ? (
        <SuperAdminDashboard />
      ) : (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-10 text-center text-sm text-ink-muted shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          Bienvenido a Registro de Horas Krontec.
        </div>
      )}
    </AppShell>
  );
}
