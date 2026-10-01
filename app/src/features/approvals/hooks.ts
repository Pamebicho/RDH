import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTrabajadores } from "@/features/admin/api";
import { fetchPlanillasDelPeriodo, fetchRegistrosPorPlanillas } from "@/features/home/api";
import { fetchProyectosActivos, fetchSemanas, fetchTiposRegistroActivos } from "@/features/hours/api";
import {
  createWeekDays,
  getColumnTotal,
  getDayTotal,
  getWeekTotal,
  resolverEtiquetaCentroCosto,
  type ColumnaRegistro,
  type HoursByDateAndColumn,
} from "@/features/hours/domain";
import { hoyIso } from "@/utils/date";
import type { PlanillaEstado, PlanillaSemanal, RegistroHoras, Periodo, Semana, Trabajador } from "@/types/database.types";
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
      etiqueta: proyecto ? resolverEtiquetaCentroCosto(proyecto.codigo, proyecto.nombre) : tipo.nombre,
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
      void queryClient.invalidateQueries({ queryKey: ["resumen-planillas-pendientes"] });
      void queryClient.invalidateQueries({ queryKey: ["resumen-planillas-en-progreso"] });
      void queryClient.invalidateQueries({ queryKey: ["planillas-en-curso"] });
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
      void queryClient.invalidateQueries({ queryKey: ["resumen-planillas-pendientes"] });
      void queryClient.invalidateQueries({ queryKey: ["resumen-planillas-en-progreso"] });
      void queryClient.invalidateQueries({ queryKey: ["planillas-en-curso"] });
    },
    onError: () => toast.error("No fue posible devolver el período."),
  });
}

export interface SemanaEstadoCumplimiento {
  semanaId: string;
  numeroSemana: number;
  fechaInicio: string;
  fechaFin: string;
  /** true si guardó al menos una hora (ordinaria, extra o ausencia) esa semana. */
  registro: boolean;
}

export interface TrabajadorCumplimiento {
  trabajadorId: string;
  nombre: string;
  semanas: SemanaEstadoCumplimiento[];
  semanasSinRegistrar: number;
}

function tieneHorasGuardadas(planilla: PlanillaSemanal | undefined): boolean {
  if (!planilla) return false;
  return (
    Number(planilla.total_ordinarias) + Number(planilla.total_extraordinarias) + Number(planilla.total_ausencias) > 0
  );
}

/**
 * Cruza trabajadores activos × semanas ya iniciadas contra las planillas del período, y arma la
 * matriz de cumplimiento. Excluye a quienes no tienen ninguna semana pendiente (ya están al día).
 * Lógica pura, separada del hook para poder testearla sin mockear React Query.
 */
export function calcularCumplimientoSemanal(
  trabajadoresActivos: Trabajador[],
  semanasIniciadas: Semana[],
  planillas: PlanillaSemanal[],
): TrabajadorCumplimiento[] {
  if (!semanasIniciadas.length) return [];

  const filas: (TrabajadorCumplimiento & { apellidoOrden: string })[] = [];

  for (const trabajador of trabajadoresActivos) {
    const semanasEstado: SemanaEstadoCumplimiento[] = semanasIniciadas.map((semana) => ({
      semanaId: semana.id,
      numeroSemana: semana.numero_semana,
      fechaInicio: semana.fecha_inicio,
      fechaFin: semana.fecha_fin,
      registro: tieneHorasGuardadas(
        planillas.find((p) => p.trabajador_id === trabajador.id && p.semana_id === semana.id),
      ),
    }));

    const semanasSinRegistrar = semanasEstado.filter((s) => !s.registro).length;
    if (semanasSinRegistrar === 0) continue;

    const nombre = [trabajador.nombres, trabajador.apellidos].filter(Boolean).join(" ");
    filas.push({
      trabajadorId: trabajador.id,
      nombre: nombre || trabajador.correo_corporativo,
      apellidoOrden: trabajador.apellidos || nombre || trabajador.correo_corporativo,
      semanas: semanasEstado,
      semanasSinRegistrar,
    });
  }

  return filas
    .sort(
      (a, b) =>
        b.semanasSinRegistrar - a.semanasSinRegistrar || a.apellidoOrden.localeCompare(b.apellidoOrden, "es"),
    )
    .map(({ apellidoOrden: _apellidoOrden, ...fila }) => fila);
}

/**
 * Para cada trabajador activo, marca semana por semana (solo las ya iniciadas del período) si
 * guardó algo o no. Solo SUPER_ADMIN ve el panorama completo: un Administrador normal no puede
 * ver, vía RLS, a un trabajador que no registró absolutamente nada en ninguno de sus proyectos.
 */
export function useCumplimientoSemanal(periodoId: string | undefined) {
  const trabajadoresQuery = useQuery({ queryKey: ["trabajadores-admin-todos"], queryFn: fetchTrabajadores });
  const semanasQuery = useQuery({
    queryKey: ["semanas", periodoId],
    queryFn: () => fetchSemanas(periodoId as string),
    enabled: Boolean(periodoId),
  });
  const planillasQuery = useQuery({
    queryKey: ["resumen-periodo-planillas", periodoId],
    queryFn: () => fetchPlanillasDelPeriodo(periodoId as string),
    enabled: Boolean(periodoId),
  });

  const semanas: Semana[] = useMemo(
    () => (semanasQuery.data ?? []).filter((semana) => semana.fecha_inicio <= hoyIso()),
    [semanasQuery.data],
  );

  const trabajadores: TrabajadorCumplimiento[] = useMemo(
    () =>
      calcularCumplimientoSemanal(
        (trabajadoresQuery.data ?? []).filter((t) => t.activo),
        semanas,
        planillasQuery.data ?? [],
      ),
    [trabajadoresQuery.data, planillasQuery.data, semanas],
  );

  return {
    semanas,
    trabajadores,
    isLoading: trabajadoresQuery.isLoading || semanasQuery.isLoading || planillasQuery.isLoading,
  };
}
