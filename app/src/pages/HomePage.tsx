import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileStack,
  Grid3x3,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { usePeriodos } from "@/features/hours/hooks";
import { formatHours } from "@/features/hours/domain";
import { useExportarResumenPeriodo, useResumenPeriodo, useResumenSuperAdmin } from "@/features/home/hooks";
import { formatDateCl } from "@/utils/date";
import type { Periodo } from "@/types/database.types";

const COLORES_PROYECTO = [
  "#0868ee",
  "#1fa971",
  "#f5a623",
  "#e05555",
  "#5b4b8a",
  "#0d9488",
  "#c026d3",
  "#64748b",
  "#c2410c",
];

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function diasRestantes(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = parseIsoDate(fechaFin);
  const diffMs = fin.getTime() - hoy.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function encontrarPeriodoActual(periodos: Periodo[]): Periodo | undefined {
  const hoyIso = new Date().toISOString().slice(0, 10);
  return (
    periodos.find((periodo) => periodo.fecha_inicio <= hoyIso && hoyIso <= periodo.fecha_fin) ?? periodos[0]
  );
}

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

function GraficoHorasPorProyecto({ datos, isLoading }: { datos: { codigo: string; horas: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-muted">Cargando…</div>;
  }
  if (!datos.length) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-sm text-ink-muted">
        Todavía no hay horas registradas en este período.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" vertical={false} />
        <XAxis dataKey="codigo" tick={{ fontSize: 11, fill: "#51617a" }} axisLine={{ stroke: "#dfe5ee" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#51617a" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          formatter={(value) => [`${value} h`, "Horas"]}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.nombre ?? label}
          contentStyle={{ borderRadius: 8, borderColor: "#dfe5ee", fontSize: 12 }}
        />
        <Bar dataKey="horas" fill="#0868ee" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GraficoDistribucionProyectos({
  datos,
  totalHoras,
  isLoading,
}: {
  datos: { codigo: string; nombre: string; horas: number }[];
  totalHoras: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-muted">Cargando…</div>;
  }
  if (!datos.length) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-sm text-ink-muted">
        Todavía no hay horas registradas en este período.
      </div>
    );
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={datos}
            dataKey="horas"
            nameKey="codigo"
            cx="50%"
            cy="50%"
            outerRadius={85}
            paddingAngle={2}
            labelLine={false}
            label={({ percent }) => ((percent ?? 0) >= 0.05 ? `${Math.round((percent ?? 0) * 100)}%` : "")}
          >
            {datos.map((item, index) => (
              <Cell key={item.codigo} fill={COLORES_PROYECTO[index % COLORES_PROYECTO.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const horas = Number(value);
              const porcentaje = totalHoras > 0 ? ((horas / totalHoras) * 100).toFixed(1) : "0";
              return [`${formatHours(horas)} h · ${porcentaje}%`, item?.payload?.nombre ?? item?.payload?.codigo];
            }}
            contentStyle={{ borderRadius: 8, borderColor: "#dfe5ee", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        {datos.map((item, index) => {
          const porcentaje = totalHoras > 0 ? Math.round((item.horas / totalHoras) * 100) : 0;
          return (
            <span key={item.codigo} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORES_PROYECTO[index % COLORES_PROYECTO.length] }}
                aria-hidden
              />
              {item.codigo} ({porcentaje}%)
            </span>
          );
        })}
      </div>
    </>
  );
}

function StatCardMini({ icon: Icon, label, value, isLoading }: { icon: typeof Users; label: string; value: string; isLoading: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[#e5eaf1] bg-[#fbfcfe] px-3.5 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-krontec-blue shadow-sm">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <span className="block text-lg font-bold leading-tight text-[#0d1e3b]">{isLoading ? "…" : value}</span>
        <span className="block truncate text-xs text-ink-muted">{label}</span>
      </div>
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
                <span className="block text-sm font-bold text-ink">{periodoSeleccionado.nombre}</span>
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

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <StatCardMini
            icon={Clock}
            label="Horas registradas"
            value={formatHours(resumenPeriodo.totalHoras)}
            isLoading={resumenPeriodo.isLoading}
          />
          <StatCardMini
            icon={UserCheck}
            label="Trabajadores con horas"
            value={String(resumenPeriodo.trabajadoresConHoras)}
            isLoading={resumenPeriodo.isLoading}
          />
          <StatCardMini
            icon={FileStack}
            label="Planillas del período"
            value={String(resumenPeriodo.planillasTotal)}
            isLoading={resumenPeriodo.isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <h2 className="mb-1 text-sm font-bold text-ink">Horas por centro de costo</h2>
          <p className="mb-2 text-xs text-ink-muted">
            {periodoSeleccionado ? `Período ${periodoSeleccionado.nombre}` : "Sin período seleccionado"}
          </p>
          <GraficoHorasPorProyecto datos={resumenPeriodo.horasPorProyecto} isLoading={resumenPeriodo.isLoading} />
        </div>

        <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <h2 className="mb-1 text-sm font-bold text-ink">Distribución de horas por centro de costo</h2>
          <p className="mb-2 text-xs text-ink-muted">
            {periodoSeleccionado ? `Período ${periodoSeleccionado.nombre}` : "Sin período seleccionado"}
          </p>
          <GraficoDistribucionProyectos
            datos={resumenPeriodo.horasPorProyecto}
            totalHoras={resumenPeriodo.totalHoras}
            isLoading={resumenPeriodo.isLoading}
          />
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
