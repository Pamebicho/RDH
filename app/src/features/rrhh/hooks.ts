import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminProyectos } from "@/features/admin/hooks";
import { descargarCsv, rowsToCsv } from "@/features/hours/domain";
import type { Periodo, RegistroHoras } from "@/types/database.types";
import { fetchPlanillasDelPeriodo, fetchRegistrosPorPlanillas, fetchTrabajadores } from "./api";

export type EstadoDistribucion = "CORRECTO" | "REVISAR" | "INCONSISTENCIA";

interface CentroCostoDistribucion {
  codigo: string;
  nombre: string;
  horas: number;
  porcentaje: number;
}

export interface DistribucionTrabajador {
  trabajadorId: string;
  nombreCompleto: string;
  rut: string;
  totalHoras: number;
  horasConCC: number;
  porcentajeDistribuido: number;
  estado: EstadoDistribucion;
  centrosCosto: CentroCostoDistribucion[];
}

const TOLERANCIA_PP = 0.05;

function calcularEstado(porcentaje: number): EstadoDistribucion {
  if (porcentaje > 100 + TOLERANCIA_PP) return "INCONSISTENCIA";
  if (porcentaje < 100 - TOLERANCIA_PP) return "REVISAR";
  return "CORRECTO";
}

export function useDistribucionCC(periodoId: string | undefined) {
  const planillasQuery = useQuery({
    queryKey: ["rrhh-distribucion-planillas", periodoId],
    queryFn: () => fetchPlanillasDelPeriodo(periodoId as string),
    enabled: Boolean(periodoId),
  });
  const planillaIds = (planillasQuery.data ?? []).map((planilla) => planilla.id);
  const registrosQuery = useQuery({
    queryKey: ["rrhh-distribucion-registros", periodoId, planillaIds.length],
    queryFn: () => fetchRegistrosPorPlanillas(planillaIds),
    enabled: Boolean(periodoId) && planillasQuery.isSuccess,
  });
  const proyectosQuery = useAdminProyectos();
  const trabajadoresQuery = useQuery({ queryKey: ["rrhh-trabajadores"], queryFn: fetchTrabajadores });

  const isLoading =
    planillasQuery.isLoading || registrosQuery.isLoading || proyectosQuery.isLoading || trabajadoresQuery.isLoading;

  const proyectoPorId = new Map((proyectosQuery.data ?? []).map((p) => [p.id, p]));
  const trabajadorPorId = new Map((trabajadoresQuery.data ?? []).map((t) => [t.id, t]));

  const registrosPorTrabajador = new Map<string, RegistroHoras[]>();
  for (const registro of registrosQuery.data ?? []) {
    const lista = registrosPorTrabajador.get(registro.trabajador_id) ?? [];
    lista.push(registro);
    registrosPorTrabajador.set(registro.trabajador_id, lista);
  }

  const trabajadores: DistribucionTrabajador[] = [...registrosPorTrabajador.entries()]
    .map(([trabajadorId, registros]) => {
      const totalHoras = registros.reduce((acc, r) => acc + Number(r.horas), 0);

      const horasPorProyectoId = new Map<string, number>();
      for (const registro of registros) {
        if (!registro.proyecto_id) continue;
        horasPorProyectoId.set(
          registro.proyecto_id,
          (horasPorProyectoId.get(registro.proyecto_id) ?? 0) + Number(registro.horas),
        );
      }

      const centrosCosto: CentroCostoDistribucion[] = [...horasPorProyectoId.entries()]
        .map(([proyectoId, horas]) => {
          const proyecto = proyectoPorId.get(proyectoId);
          return {
            codigo: proyecto?.codigo ?? "",
            nombre: proyecto?.nombre ?? "",
            horas,
            porcentaje: totalHoras > 0 ? (horas / totalHoras) * 100 : 0,
          };
        })
        .sort((a, b) => b.horas - a.horas);

      const horasConCC = centrosCosto.reduce((acc, c) => acc + c.horas, 0);
      const porcentajeDistribuido = totalHoras > 0 ? (horasConCC / totalHoras) * 100 : 0;

      const trabajador = trabajadorPorId.get(trabajadorId);
      const nombreCompleto = trabajador ? [trabajador.nombres, trabajador.apellidos].filter(Boolean).join(" ") : "";

      return {
        trabajadorId,
        nombreCompleto: nombreCompleto || "(sin nombre)",
        rut: trabajador?.rut ?? "",
        totalHoras,
        horasConCC,
        porcentajeDistribuido,
        estado: calcularEstado(porcentajeDistribuido),
        centrosCosto,
      };
    })
    .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));

  const resumen = {
    total: trabajadores.length,
    correctos: trabajadores.filter((t) => t.estado === "CORRECTO").length,
    revisar: trabajadores.filter((t) => t.estado === "REVISAR").length,
    inconsistencia: trabajadores.filter((t) => t.estado === "INCONSISTENCIA").length,
  };

  return { isLoading, trabajadores, resumen };
}

/** Reparte un total entero entre pesos proporcionales, método del mayor resto (asegura que la suma final dé exacto). */
function redondearPesos(porcentajes: number[], totalEntero: number): number[] {
  const bases = porcentajes.map((p) => Math.floor(p));
  let restante = totalEntero - bases.reduce((acc, b) => acc + b, 0);

  const ordenPorResto = porcentajes
    .map((p, indice) => ({ indice, resto: p - Math.floor(p) }))
    .sort((a, b) => b.resto - a.resto);

  const resultado = [...bases];
  for (const { indice } of ordenPorResto) {
    if (restante <= 0) break;
    resultado[indice] += 1;
    restante -= 1;
  }
  return resultado;
}

/** Exporta la distribución de HH por Centro de Costo al formato exacto que espera la plataforma externa de RRHH. */
export function useExportarDistribucionCC() {
  return useMutation({
    mutationFn: async ({ periodo, trabajadores }: { periodo: Periodo; trabajadores: DistribucionTrabajador[] }) => {
      const conProblemas = trabajadores.filter((t) => t.estado !== "CORRECTO");
      if (conProblemas.length > 0) {
        toast.warning(
          `${conProblemas.length} trabajador${conProblemas.length === 1 ? "" : "es"} con distribución incompleta (vacaciones, licencias u otras horas sin centro de costo) — se exportan solo sus Centros de Costo ya asignados.`,
        );
      }

      const filas: string[][] = [];
      for (const trabajador of trabajadores) {
        if (!trabajador.centrosCosto.length) continue;
        const pesos = redondearPesos(
          trabajador.centrosCosto.map((c) => c.porcentaje),
          Math.round(trabajador.porcentajeDistribuido),
        );
        trabajador.centrosCosto.forEach((cc, indice) => {
          filas.push([trabajador.rut, "F1", cc.codigo, String(pesos[indice])]);
        });
      }

      const header = ["Número de Documento Colaborador", "Código de Ficha Colaborador", "Centro de Costo*", "Peso*"];
      const csv = rowsToCsv([header, ...filas]);
      descargarCsv(csv, `distribucion-cc-${periodo.nombre.replaceAll(" ", "-").toLowerCase()}.csv`);
    },
    onSuccess: () => {
      toast.success("Se descargó la distribución de Centros de Costo en un archivo CSV.");
    },
    onError: () => {
      toast.error("No fue posible exportar la distribución.");
    },
  });
}
