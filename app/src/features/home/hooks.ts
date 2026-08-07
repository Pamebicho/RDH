import { useQuery } from "@tanstack/react-query";
import {
  fetchCentrosCostoActivosCount,
  fetchPlanillasPendientesCount,
  fetchTrabajadoresActivosCount,
} from "./api";

export function useResumenSuperAdmin() {
  const trabajadoresQuery = useQuery({
    queryKey: ["resumen-trabajadores-activos"],
    queryFn: fetchTrabajadoresActivosCount,
  });
  const centrosQuery = useQuery({
    queryKey: ["resumen-centros-activos"],
    queryFn: fetchCentrosCostoActivosCount,
  });
  const pendientesQuery = useQuery({
    queryKey: ["resumen-planillas-pendientes"],
    queryFn: fetchPlanillasPendientesCount,
  });

  return {
    trabajadoresActivos: trabajadoresQuery.data ?? 0,
    centrosCostoActivos: centrosQuery.data ?? 0,
    planillasPendientes: pendientesQuery.data ?? 0,
    isLoading: trabajadoresQuery.isLoading || centrosQuery.isLoading || pendientesQuery.isLoading,
  };
}
