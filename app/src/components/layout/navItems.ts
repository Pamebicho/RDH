import {
  BarChart3,
  Building2,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Home,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", icon: Home },
  { label: "Registro de horas", icon: CalendarRange, href: "/registro-horas" },
  { label: "Mis períodos", icon: ClipboardList },
  { label: "Aprobaciones", icon: CheckCircle2 },
  { label: "Centros de costo", icon: Building2 },
  { label: "Reportes", icon: BarChart3 },
  { label: "Administración", icon: Settings },
];
