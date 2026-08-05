import type { ReactNode } from "react";
import { useWorkforce } from "@/features/workforce/useWorkforce";
import { NoAccessPage } from "@/pages/NoAccessPage";
import type { RolCodigo } from "@/types/database.types";

interface RoleRouteProps {
  roles: RolCodigo[];
  children: ReactNode;
}

/** Exige que el trabajador actual tenga al menos uno de los roles indicados. */
export function RoleRoute({ roles, children }: RoleRouteProps) {
  const { hasRole, isLoading } = useWorkforce();

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-ink-muted">Cargando permisos…</div>;
  }

  const autorizado = roles.some((rol) => hasRole(rol));

  if (!autorizado) {
    return <NoAccessPage />;
  }

  return <>{children}</>;
}
