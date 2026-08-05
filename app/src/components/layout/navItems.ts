import { BarChart3, CalendarRange, CheckCircle2, Home, Settings, type LucideIcon } from "lucide-react";
import type { RolCodigo } from "@/types/database.types";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  /** Si se omite, el ítem es visible para cualquier rol. */
  roles?: RolCodigo[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", icon: Home },
  {
    label: "Registro de horas",
    icon: CalendarRange,
    href: "/registro-horas",
    roles: ["TRABAJADOR", "ADMINISTRADOR", "SUPER_ADMIN"],
  },
  {
    label: "Aprobaciones",
    icon: CheckCircle2,
    href: "/aprobaciones",
    roles: ["ADMINISTRADOR", "SUPER_ADMIN"],
  },
  {
    label: "Reportes",
    icon: BarChart3,
    href: "/reportes",
    roles: ["LECTOR", "SUPER_ADMIN"],
  },
  {
    label: "Configuración",
    icon: Settings,
    href: "/administracion",
    roles: ["SUPER_ADMIN"],
  },
];
