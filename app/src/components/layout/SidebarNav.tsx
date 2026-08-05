import { NavLink } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { NAV_ITEMS } from "./navItems";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hasRole } = useWorkforce();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.some((rol) => hasRole(rol)));

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Módulos del sistema">
      {visibleItems.map((item) => {
        const Icon = item.icon;

        if (!item.href) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                toast(`El módulo "${item.label}" se construirá en la siguiente etapa.`);
                onNavigate?.();
              }}
              className="flex min-h-[56px] items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-white/90 transition-all duration-fast hover:translate-x-0.5 hover:bg-white/10"
            >
              <Icon className="h-[1.35rem] w-[1.35rem] shrink-0" aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.label}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-h-[56px] items-center gap-3.5 rounded-xl px-3.5 py-3 text-white/90 transition-all duration-fast hover:translate-x-0.5 hover:bg-white/10",
                isActive &&
                  "bg-gradient-to-br from-[#0b65dd] to-[#0750b7] text-white shadow-[0_0.8rem_1.75rem_rgba(0,89,205,0.26)] hover:translate-x-0",
              )
            }
          >
            <Icon className="h-[1.35rem] w-[1.35rem] shrink-0" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
