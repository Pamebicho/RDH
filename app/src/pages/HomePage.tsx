import { useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, Grid3x3, Settings, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { usePeriodos } from "@/features/hours/hooks";
import { useResumenSuperAdmin } from "@/features/home/hooks";
import { formatDateCl } from "@/utils/date";
import type { Periodo } from "@/types/database.types";

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

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const resumen = useResumenSuperAdmin();
  const periodosQuery = usePeriodos();
  const periodoActual = encontrarPeriodoActual(periodosQuery.data ?? []);

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
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-krontec-blue">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          {periodosQuery.isLoading ? (
            <span className="text-sm text-ink-muted">Cargando período…</span>
          ) : periodoActual ? (
            <div>
              <span className="block text-sm font-bold text-ink">{periodoActual.nombre}</span>
              <span className="block text-xs text-ink-muted">
                {formatDateCl(periodoActual.fecha_inicio)} – {formatDateCl(periodoActual.fecha_fin)}
                {" · "}
                {(() => {
                  const dias = diasRestantes(periodoActual.fecha_fin);
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
