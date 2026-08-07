import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
import { ProyectosTab } from "@/features/admin/components/ProyectosTab";
import { JornadasTab } from "@/features/admin/components/JornadasTab";
import { PersonasTab } from "@/features/admin/components/PersonasTab";

const TABS = [
  { id: "personas", label: "Personas y roles", Component: PersonasTab },
  { id: "proyectos", label: "Proyectos", Component: ProyectosTab },
  { id: "jornadas", label: "Jornadas", Component: JornadasTab },
] as const;

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("personas");
  const ActiveComponent = TABS.find((tab) => tab.id === activeTab)?.Component ?? PersonasTab;

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0d1e3b] sm:text-3xl">Configuración</h1>
        <p className="mt-1.5 text-sm text-[#314460]">
          Catálogos del sistema: personas y roles, proyectos, jornadas y más.
        </p>
      </section>

      <nav className="mb-4 flex flex-wrap gap-2 border-b border-[#e5eaf1] pb-3" aria-label="Secciones de administración">
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
