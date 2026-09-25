import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
import { PendientesTab } from "@/features/approvals/components/PendientesTab";
import { EnProgresoTab } from "@/features/approvals/components/EnProgresoTab";

const TABS = [
  { id: "pendientes", label: "Pendientes de aprobar", Component: PendientesTab },
  { id: "en-progreso", label: "En progreso", Component: EnProgresoTab },
] as const;

export function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("pendientes");
  const ActiveComponent = TABS.find((tab) => tab.id === activeTab)?.Component ?? PendientesTab;

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">Aprobaciones</h1>
        <p className="mt-1.5 text-sm text-[#314460]">
          Períodos enviados por trabajadores de tus proyectos, y lo que van guardando antes de enviarlo.
        </p>
      </section>

      <nav className="mb-4 flex flex-wrap gap-2 border-b border-[#e5eaf1] pb-3" aria-label="Secciones de aprobaciones">
        {TABS.map((tab) => (
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
