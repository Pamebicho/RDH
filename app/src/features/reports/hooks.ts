import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrabajadoresPorIds } from "@/features/approvals/api";
import { roundHours } from "@/features/hours/domain";
import { fetchPlanillasPorPeriodo } from "./api";

export interface FilaReporte {
  trabajadorId: string;
  nombre: string;
  ordinarias: number;
  extraordinarias: number;
  ausencias: number;
  total: number;
  planillasEnviadas: number;
  planillasAprobadas: number;
}

export function useReportePeriodo(periodoId: string | undefined) {
  const planillasQuery = useQuery({
    queryKey: ["reporte-planillas", periodoId],
    queryFn: () => fetchPlanillasPorPeriodo(periodoId as string),
    enabled: Boolean(periodoId),
  });

  const trabajadorIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.trabajador_id))],
    [planillasQuery.data],
  );

  const trabajadoresQuery = useQuery({
    queryKey: ["trabajadores-por-ids", trabajadorIds],
    queryFn: () => fetchTrabajadoresPorIds(trabajadorIds),
    enabled: trabajadorIds.length > 0,
  });

  const filas: FilaReporte[] = useMemo(() => {
    const trabajadorPorId = new Map((trabajadoresQuery.data ?? []).map((t) => [t.id, t]));
    const acumulado = new Map<string, FilaReporte>();

    for (const planilla of planillasQuery.data ?? []) {
      const trabajador = trabajadorPorId.get(planilla.trabajador_id);
      const nombre =
        [trabajador?.nombres, trabajador?.apellidos].filter(Boolean).join(" ") ||
        trabajador?.correo_corporativo ||
        "Trabajador";

      const fila = acumulado.get(planilla.trabajador_id) ?? {
        trabajadorId: planilla.trabajador_id,
        nombre,
        ordinarias: 0,
        extraordinarias: 0,
        ausencias: 0,
        total: 0,
        planillasEnviadas: 0,
        planillasAprobadas: 0,
      };

      fila.ordinarias = roundHours(fila.ordinarias + Number(planilla.total_ordinarias));
      fila.extraordinarias = roundHours(fila.extraordinarias + Number(planilla.total_extraordinarias));
      fila.ausencias = roundHours(fila.ausencias + Number(planilla.total_ausencias));
      fila.total = roundHours(fila.ordinarias + fila.extraordinarias + fila.ausencias);
      if (planilla.estado === "ENVIADA") fila.planillasEnviadas += 1;
      if (planilla.estado === "APROBADA") fila.planillasAprobadas += 1;

      acumulado.set(planilla.trabajador_id, fila);
    }

    return [...acumulado.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [planillasQuery.data, trabajadoresQuery.data]);

  return {
    filas,
    isLoading: planillasQuery.isLoading || trabajadoresQuery.isFetching,
  };
}
