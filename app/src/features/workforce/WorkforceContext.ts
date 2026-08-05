import { createContext } from "react";
import type { RolCodigo, Trabajador } from "@/types/database.types";

export interface WorkforceContextValue {
  trabajador: Trabajador | null;
  roles: RolCodigo[];
  hasRole: (codigo: RolCodigo) => boolean;
  isLoading: boolean;
}

export const WorkforceContext = createContext<WorkforceContextValue | undefined>(undefined);
