import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { PendientesTab } from "@/features/approvals/components/PendientesTab";
import { EnProgresoTab } from "@/features/approvals/components/EnProgresoTab";
import { SinRegistrarTab } from "@/features/approvals/components/SinRegistrarTab";

const TAB_PENDIENTES = { id: "pendientes", label: "Pendientes de aprobar", Component: PendientesTab } as const;
const TAB_EN_PROGRESO = { id: "en-progreso", label: "En progreso", Component: EnProgresoTab } as const;
const TAB_SIN_REGISTRAR = { id: "sin-registrar", label: "Sin registrar", Component: SinRegistrarTab } as const;

export function ApprovalsPage() {
  const { hasRole } = useWorkforce();
  // "Sin registrar" solo tiene sentido completo para SUPER_ADMIN: un Administrador normal no
  // puede ver, por RLS, a un trabajador que no registró nada en ninguno de sus proyectos.
  const tabs = useMemo(
    () => (hasRole("SUPER_ADMIN") ? [TAB_PENDIENTES, TAB_EN_PROGRESO, TAB_SIN_REGISTRAR] : [TAB_PENDIENTES, TAB_EN_PROGRESO]),
    [hasRole],
  );
  const [activeTab, setActiveTab] = useState<string>(TAB_PENDIENTES.id);
  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.Component ?? PendientesTab;

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">Aprobaciones</h1>
        <p className="mt-1.5 text-sm text-[#314460]">
          Períodos enviados por trabajadores de tus proyectos, y lo que van guardando antes de enviarlo.
        </p>
      </section>

      <nav className="mb-4 flex flex-wrap gap-2 border-b border-[#e5eaf1] pb-3" aria-label="Secciones de aprobaciones">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-control px-3.5 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id ? "bg-krontec-blue text-white" : "text-ink-muted hover:bg-bg",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <ActiveComponent />
    </AppShell>
  );
}
