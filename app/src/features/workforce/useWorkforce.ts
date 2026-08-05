import { useContext } from "react";
import { WorkforceContext } from "./WorkforceContext";

export function useWorkforce() {
  const context = useContext(WorkforceContext);

  if (!context) {
    throw new Error("useWorkforce debe usarse dentro de <WorkforceProvider>.");
  }

  return context;
}
