import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/useAuth";
import type { RolCodigo, Trabajador } from "@/types/database.types";
import { fetchRolesActivos, fetchTrabajadorPorAuthId } from "./api";
import { WorkforceContext } from "./WorkforceContext";

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [roles, setRoles] = useState<RolCodigo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!session?.user.id) {
        setTrabajador(null);
        setRoles([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const trabajadorEncontrado = await fetchTrabajadorPorAuthId(session.user.id);
      const rolesEncontrados = trabajadorEncontrado
        ? await fetchRolesActivos(trabajadorEncontrado.id)
        : [];

      if (!cancelled) {
        setTrabajador(trabajadorEncontrado);
        setRoles(rolesEncontrados);
        setIsLoading(false);
      }
    }

    if (!isAuthLoading) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, isAuthLoading]);

  const hasRole = useMemo(() => (codigo: RolCodigo) => roles.includes(codigo), [roles]);

  return (
    <WorkforceContext.Provider value={{ trabajador, roles, hasRole, isLoading: isAuthLoading || isLoading }}>
      {children}
    </WorkforceContext.Provider>
  );
}
