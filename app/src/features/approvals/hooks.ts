import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRegistrosPorPlanillas } from "@/features/home/api";
import { fetchProyectosActivos, fetchTiposRegistroActivos } from "@/features/hours/api";
import {
  createWeekDays,
  getColumnTotal,
  getDayTotal,
  getWeekTotal,
  type ColumnaRegistro,
  type HoursByDateAndColumn,
} from "@/features/hours/domain";
import type { PlanillaEstado, PlanillaSemanal, RegistroHoras, Periodo, Trabajador } from "@/types/database.types";
import {
  aprobarPlanilla,
  devolverPlanilla,
  fetchHistorialAprobacionesMultiple,
  fetchPeriodosPorIds,
  fetchPlanillasEnCurso,
  fetchPlanillasEnviadas,
  fetchTrabajadoresPorIds,
} from "./api";

interface PeriodoAgrupadoBase {
  trabajadorId: string;
  trabajadorNombre: string;
  periodoId: string;
  periodoNombre: string;
  periodoFechaInicio: string;
  periodoFechaFin: string;
  planillaIds: string[];
  totalOrdinarias: number;
  totalExtraordinarias: number;
  totalAusencias: number;
  /** Estados distintos entre las semanas agrupadas (una planilla por semana). */
  estados: PlanillaEstado[];
  /** Fecha de referencia según `campoFecha`/`comparacion` pasados a la función. */
  fechaReferencia: string | null;
}

/**
 * Agrupa planillas semanales por trabajador+período en un solo registro por período (varias
 * semanas = un período). Se reutiliza tanto para "pendientes de aprobar" (ENVIADA, fecha mínima
 * de envío) como para "en progreso" (BORRADOR/DEVUELTA, fecha máxima de última edición).
 */
function agruparPlanillasPorTrabajadorYPeriodo(
  planillas: PlanillaSemanal[],
  trabajadorPorId: Map<string, Trabajador>,
  periodoPorId: Map<string, Periodo>,
  opciones: { campoFecha: "enviada_en" | "actualizado_en"; comparacion: "min" | "max" },
): PeriodoAgrupadoBase[] {
  const grupos = new Map<string, PeriodoAgrupadoBase>();

  for (const planilla of planillas) {
    const clave = `${planilla.trabajador_id}|${planilla.periodo_id}`;
    const fechaPlanilla = planilla[opciones.campoFecha];
    const existente = grupos.get(clave);

    if (!existente) {
      const trabajador = trabajadorPorId.get(planilla.trabajador_id);
      const periodo = periodoPorId.get(planilla.periodo_id);
      const nombre = [trabajador?.nombres, trabajador?.apellidos].filter(Boolean).join(" ");

      grupos.set(clave, {
        trabajadorId: planilla.trabajador_id,
        trabajadorNombre: nombre || trabajador?.correo_corporativo || "Trabajador",
        periodoId: planilla.periodo_id,
        periodoNombre: periodo?.nombre ?? "",
        periodoFechaInicio: periodo?.fecha_inicio ?? "",
        periodoFechaFin: periodo?.fecha_fin ?? "",
        planillaIds: [planilla.id],
        totalOrdinarias: Number(planilla.total_ordinarias),
        totalExtraordinarias: Number(planilla.total_extraordinarias),
        totalAusencias: Number(planilla.total_ausencias),
        estados: [planilla.estado],
        fechaReferencia: fechaPlanilla,
      });
      continue;
    }

    existente.planillaIds.push(planilla.id);
    existente.totalOrdinarias += Number(planilla.total_ordinarias);
    existente.totalExtraordinarias += Number(planilla.total_extraordinarias);
    existente.totalAusencias += Number(planilla.total_ausencias);
    if (!existente.estados.includes(planilla.estado)) existente.estados.push(planilla.estado);

    if (fechaPlanilla) {
      const esMasRelevante =
        !existente.fechaReferencia ||
        (opciones.comparacion === "min"
          ? fechaPlanilla < existente.fechaReferencia
          : fechaPlanilla > existente.fechaReferencia);
      if (esMasRelevante) existente.fechaReferencia = fechaPlanilla;
    }
  }

  return [...grupos.values()].sort((a, b) => a.trabajadorNombre.localeCompare(b.trabajadorNombre, "es"));
}

export interface PeriodoPendiente {
  trabajadorId: string;
  trabajadorNombre: string;
  periodoId: string;
  periodoNombre: string;
  periodoFechaInicio: string;
  periodoFechaFin: string;
  planillaIds: string[];
  totalOrdinarias: number;
  totalExtraordinarias: number;
  totalAusencias: number;
  enviadaEn: string | null;
}

/** Agrupa las planillas semanales ENVIADA por trabajador+período: un solo período pendiente por trabajador. */
export function usePeriodosPendientes() {
  const planillasQuery = useQuery({ queryKey: ["planillas-enviadas"], queryFn: fetchPlanillasEnviadas });

  const trabajadorIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.trabajador_id))],
    [planillasQuery.data],
  );
  const periodoIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.periodo_id))],
    [planillasQuery.data],
  );

  const trabajadoresQuery = useQuery({
    queryKey: ["trabajadores-por-ids", trabajadorIds],
    queryFn: () => fetchTrabajadoresPorIds(trabajadorIds),
    enabled: trabajadorIds.length > 0,
  });

  const periodosQuery = useQuery({
    queryKey: ["periodos-por-ids", periodoIds],
    queryFn: () => fetchPeriodosPorIds(periodoIds),
    enabled: periodoIds.length > 0,
  });

  const periodos: PeriodoPendiente[] = useMemo(() => {
    const trabajadorPorId = new Map((trabajadoresQuery.data ?? []).map((t) => [t.id, t]));
    const periodoPorId = new Map((periodosQuery.data ?? []).map((p) => [p.id, p]));
    const grupos = agruparPlanillasPorTrabajadorYPeriodo(planillasQuery.data ?? [], trabajadorPorId, periodoPorId, {
      campoFecha: "enviada_en",
      comparacion: "min",
    });

    return grupos.map(({ estados: _estados, fechaReferencia, ...resto }) => ({
      ...resto,
      enviadaEn: fechaReferencia,
    }));
  }, [planillasQuery.data, trabajadoresQuery.data, periodosQuery.data]);

  return {
    periodos,
    isLoading:
      planillasQuery.isLoading || trabajadoresQuery.isFetching || periodosQuery.isFetching,
  };
}

export interface PeriodoEnCurso {
  trabajadorId: string;
  trabajadorNombre: string;
  periodoId: string;
  periodoNombre: string;
  periodoFechaInicio: string;
  periodoFechaFin: string;
  planillaIds: string[];
  totalOrdinarias: number;
  totalExtraordinarias: number;
  totalAusencias: number;
  actualizadoEn: string | null;
  /** true si alguna semana del período está DEVUELTA (se está corrigiendo), no solo BORRADOR nueva. */
  enCorreccion: boolean;
}

/**
 * Agrupa por trabajador+período las planillas BORRADOR/DEVUELTA: trabajo en progreso que aún no
 * se ha enviado (o que se devolvió y se está reeditando), para que un administrador pueda verlo
 * en modo lectura antes del envío definitivo.
 */
export function usePeriodosEnCurso(periodoId?: string) {
  const planillasQuery = useQuery({
    queryKey: ["planillas-en-curso", periodoId ?? null],
    queryFn: () => fetchPlanillasEnCurso(periodoId),
  });

  const trabajadorIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.trabajador_id))],
    [planillasQuery.data],
  );
  const periodoIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.periodo_id))],
    [planillasQuery.data],
  );

  const trabajadoresQuery = useQuery({
    queryKey: ["trabajadores-por-ids", trabajadorIds],
    queryFn: () => fetchTrabajadoresPorIds(trabajadorIds),
    enabled: trabajadorIds.length > 0,
  });

  const periodosQuery = useQuery({
    queryKey: ["periodos-por-ids", periodoIds],
    queryFn: () => fetchPeriodosPorIds(periodoIds),
    enabled: periodoIds.length > 0,
  });

  const periodos: PeriodoEnCurso[] = useMemo(() => {
    const trabajadorPorId = new Map((trabajadoresQuery.data ?? []).map((t) => [t.id, t]));
    const periodoPorId = new Map((periodosQuery.data ?? []).map((p) => [p.id, p]));
    const grupos = agruparPlanillasPorTrabajadorYPeriodo(planillasQuery.data ?? [], trabajadorPorId, periodoPorId, {
      campoFecha: "actualizado_en",
      comparacion: "max",
    });

    return grupos.map(({ estados, fechaReferencia, ...resto }) => ({
      ...resto,
      actualizadoEn: fechaReferencia,
      enCorreccion: estados.includes("DEVUELTA"),
    }));
  }, [planillasQuery.data, trabajadoresQuery.data, periodosQuery.data]);

  return {
    periodos,
    isLoading:
      planillasQuery.isLoading || trabajadoresQuery.isFetching || periodosQuery.isFetching,
  };
}

function buildColumnasDesdeRegistros(
  registros: RegistroHoras[],
  proyectos: { id: string; codigo: string; nombre: string }[],
  tipos: { id: string; codigo: string; nombre: string; categoria: string; es_hora_extra: boolean }[],
): ColumnaRegistro[] {
  const proyectoPorId = new Map(proyectos.map((p) => [p.id, p]));
  const tipoPorId = new Map(tipos.map((t) => [t.id, t]));
  const vistos = new Set<string>();
  const columnas: ColumnaRegistro[] = [];

  for (const registro of registros) {
    const tipo = tipoPorId.get(registro.tipo_registro_id);
    if (!tipo) continue;

    const columnaId = registro.proyecto_id ?? tipo.codigo;
    if (vistos.has(columnaId)) continue;
    vistos.add(columnaId);

    const proyecto = registro.proyecto_id ? proyectoPorId.get(registro.proyecto_id) : undefined;

    columnas.push({
      id: columnaId,
      tipoRegistroId: tipo.id,
      proyectoId: registro.proyecto_id,
      codigo: proyecto?.codigo ?? tipo.codigo,
      etiqueta: proyecto?.nombre ?? tipo.nombre,
      categoria: tipo.categoria,
      esHoraExtra: tipo.es_hora_extra,
    });
  }

  return columnas;
}

/** Detalle de TODAS las semanas (planillas) de un período pendiente, mostradas como una sola tabla. */
export function usePeriodoDetalle(planillaIds: string[], periodoFechaInicio?: string, periodoFechaFin?: string) {
  const registrosQuery = useQuery({
    queryKey: ["registros-periodo-detalle", planillaIds],
    queryFn: () => fetchRegistrosPorPlanillas(planillaIds),
    enabled: planillaIds.length > 0,
  });

  const historialQuery = useQuery({
    queryKey: ["historial-aprobaciones", planillaIds],
    queryFn: () => fetchHistorialAprobacionesMultiple(planillaIds),
    enabled: planillaIds.length > 0,
  });

  const proyectosQuery = useQuery({ queryKey: ["proyectos-activos"], queryFn: fetchProyectosActivos });
  const tiposQuery = useQuery({ queryKey: ["tipos-registro-activos"], queryFn: fetchTiposRegistroActivos });

  const columnas = useMemo(
    () =>
      buildColumnasDesdeRegistros(registrosQuery.data ?? [], proyectosQuery.data ?? [], tiposQuery.data ?? []),
    [registrosQuery.data, proyectosQuery.data, tiposQuery.data],
  );

  const hours: HoursByDateAndColumn = useMemo(() => {
    const map: HoursByDateAndColumn = {};
    for (const registro of registrosQuery.data ?? []) {
      const columnaId = registro.proyecto_id ?? columnas.find((c) => c.tipoRegistroId === registro.tipo_registro_id)?.id;
      if (!columnaId) continue;
      map[registro.fecha] = { ...map[registro.fecha], [columnaId]: Number(registro.horas) };
    }
    return map;
  }, [registrosQuery.data, columnas]);

  const days = useMemo(
    () => (periodoFechaInicio && periodoFechaFin ? createWeekDays(periodoFechaInicio, periodoFechaFin) : []),
    [periodoFechaInicio, periodoFechaFin],
  );

  return {
    isLoading: registrosQuery.isLoading || proyectosQuery.isLoading || tiposQuery.isLoading,
    days,
    columnas,
    hours,
    historial: historialQuery.data ?? [],
    getDayTotal: (date: string) => getDayTotal(hours, columnas, date),
    getColumnTotal: (columnId: string) => getColumnTotal(hours, columnId),
    weekTotal: getWeekTotal(days, hours, columnas),
  };
}

/** Aprueba todas las semanas (planillas) del período de una vez. */
export function useAprobarPeriodo(administradorId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planillaIds: string[]) =>
      Promise.all(planillaIds.map((planillaId) => aprobarPlanilla(planillaId, administradorId as string))),
    onSuccess: () => {
      toast.success("Período aprobado.");
      void queryClient.invalidateQueries({ queryKey: ["planillas-enviadas"] });
    },
    onError: () => toast.error("No fue posible aprobar el período."),
  });
}

/** Devuelve todas las semanas (planillas) del período de una vez, con el mismo comentario. */
export function useDevolverPeriodo(administradorId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planillaIds, comentario }: { planillaIds: string[]; comentario: string }) =>
      Promise.all(
        planillaIds.map((planillaId) => devolverPlanilla(planillaId, administradorId as string, comentario)),
      ),
    onSuccess: () => {
      toast.success("Período devuelto al trabajador.");
      void queryClient.invalidateQueries({ queryKey: ["planillas-enviadas"] });
    },
    onError: () => toast.error("No fue posible devolver el período."),
  });
}
