import { supabase } from "@/lib/supabaseClient";
import type {
  Periodo,
  PlanillaSemanal,
  Proyecto,
  RegistroHoras,
  Semana,
  TipoRegistro,
} from "@/types/database.types";
import type { HorasEsperadasPorDia, TotalesPorCategoria } from "./domain";

export async function fetchPeriodos(): Promise<Periodo[]> {
  const { data, error } = await supabase
    .from("periodos")
    .select("*")
    .order("fecha_inicio", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchSemanas(periodoId: string): Promise<Semana[]> {
  const { data, error } = await supabase
    .from("semanas")
    .select("*")
    .eq("periodo_id", periodoId)
    .order("numero_semana");

  if (error) throw error;
  return data ?? [];
}

export async function fetchProyectosActivos(): Promise<Proyecto[]> {
  const { data, error } = await supabase.from("proyectos").select("*").eq("activo", true).order("codigo");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTiposRegistroActivos(): Promise<TipoRegistro[]> {
  const { data, error } = await supabase
    .from("tipos_registro")
    .select("*")
    .eq("activo", true)
    .order("orden_visual");

  if (error) throw error;
  return data ?? [];
}

/**
 * Centros de costo elegidos por el trabajador para un período puntual. Si no hay ninguno
 * guardado (caso normal) se usan todos los proyectos activos, que hoy son los 5 fijos.
 */
export async function fetchProyectosSeleccionadosIds(trabajadorId: string, periodoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("trabajador_proyectos_periodo")
    .select("proyecto_id")
    .eq("trabajador_id", trabajadorId)
    .eq("periodo_id", periodoId)
    .eq("activo", true);

  if (error) throw error;
  return (data ?? []).map((row) => row.proyecto_id);
}

export async function updateProyectosSeleccionados(
  trabajadorId: string,
  periodoId: string,
  proyectoIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("trabajador_proyectos_periodo")
    .delete()
    .eq("trabajador_id", trabajadorId)
    .eq("periodo_id", periodoId);

  if (deleteError) throw deleteError;
  if (!proyectoIds.length) return;

  const { error: insertError } = await supabase.from("trabajador_proyectos_periodo").insert(
    proyectoIds.map((proyecto_id, index) => ({
      trabajador_id: trabajadorId,
      periodo_id: periodoId,
      proyecto_id,
      orden_visual: index,
    })),
  );

  if (insertError) throw insertError;
}

export async function fetchRegistrosPeriodo(
  trabajadorId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<RegistroHoras[]> {
  const { data, error } = await supabase
    .from("registros_horas")
    .select("*")
    .eq("trabajador_id", trabajadorId)
    .eq("anulado", false)
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin);

  if (error) throw error;
  return data ?? [];
}

/** Horas esperadas por día de semana según la jornada vigente del trabajador (o "ESTANDAR" si no tiene asignada). */
export async function fetchHorasEsperadasPorDia(
  trabajadorId: string,
  fechaReferencia: string,
): Promise<HorasEsperadasPorDia> {
  const { data: asignaciones, error: asignacionesError } = await supabase
    .from("trabajador_jornadas")
    .select("jornada_id, fecha_inicio, fecha_fin")
    .eq("trabajador_id", trabajadorId)
    .eq("activo", true)
    .lte("fecha_inicio", fechaReferencia)
    .or(`fecha_fin.is.null,fecha_fin.gte.${fechaReferencia}`)
    .order("fecha_inicio", { ascending: false })
    .limit(1);

  if (asignacionesError) throw asignacionesError;

  let jornadaId: string | undefined = asignaciones?.[0]?.jornada_id;

  if (!jornadaId) {
    const { data: estandar, error: estandarError } = await supabase
      .from("jornadas")
      .select("id")
      .eq("codigo", "ESTANDAR")
      .maybeSingle();

    if (estandarError) throw estandarError;
    jornadaId = estandar?.id;
  }

  if (!jornadaId) return {};

  const { data: dias, error: diasError } = await supabase
    .from("jornada_dias")
    .select("dia_semana, horas_esperadas")
    .eq("jornada_id", jornadaId);

  if (diasError) throw diasError;

  return Object.fromEntries((dias ?? []).map((dia) => [dia.dia_semana, Number(dia.horas_esperadas)]));
}

export async function fetchFeriados(fechaInicio: string, fechaFin: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("feriados")
    .select("fecha")
    .eq("activo", true)
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin);

  if (error) throw error;
  return new Set((data ?? []).map((feriado) => feriado.fecha));
}

export async function fetchPlanilla(trabajadorId: string, semanaId: string): Promise<PlanillaSemanal | null> {
  const { data, error } = await supabase
    .from("planillas_semanales")
    .select("*")
    .eq("trabajador_id", trabajadorId)
    .eq("semana_id", semanaId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensurePlanilla(
  trabajadorId: string,
  semanaId: string,
  periodoId: string,
): Promise<PlanillaSemanal> {
  const existing = await fetchPlanilla(trabajadorId, semanaId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("planillas_semanales")
    .insert({ trabajador_id: trabajadorId, semana_id: semanaId, periodo_id: periodoId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchRegistros(planillaId: string): Promise<RegistroHoras[]> {
  const { data, error } = await supabase
    .from("registros_horas")
    .select("*")
    .eq("planilla_semanal_id", planillaId)
    .eq("anulado", false);

  if (error) throw error;
  return data ?? [];
}

export interface RegistroUpsert {
  planilla_semanal_id: string;
  trabajador_id: string;
  fecha: string;
  proyecto_id: string | null;
  tipo_registro_id: string;
  horas: number;
}

/**
 * Guarda los registros de una semana. Las columnas con proyecto usan upsert normal
 * (el UNIQUE de la tabla las identifica sin ambigüedad). Las columnas sin proyecto
 * (VAC/LIC/PER/AUS/CAP/HEX) se manejan con borrar-e-insertar, porque en Postgres dos
 * filas con proyecto_id NULL nunca "chocan" en un UNIQUE — ON CONFLICT no serviría
 * para evitar duplicados ahí.
 */
export async function upsertRegistros(rows: RegistroUpsert[]): Promise<void> {
  const conProyecto = rows.filter((row) => row.proyecto_id !== null);
  const sinProyecto = rows.filter((row) => row.proyecto_id === null);

  if (conProyecto.length) {
    const { error } = await supabase
      .from("registros_horas")
      .upsert(conProyecto, { onConflict: "trabajador_id,fecha,tipo_registro_id,proyecto_id" });

    if (error) throw error;
  }

  await Promise.all(
    sinProyecto.map(async (row) => {
      const { error: deleteError } = await supabase
        .from("registros_horas")
        .delete()
        .eq("trabajador_id", row.trabajador_id)
        .eq("fecha", row.fecha)
        .eq("tipo_registro_id", row.tipo_registro_id)
        .is("proyecto_id", null);

      if (deleteError) throw deleteError;
      if (row.horas <= 0) return;

      const { error: insertError } = await supabase.from("registros_horas").insert(row);
      if (insertError) throw insertError;
    }),
  );
}

export async function submitPlanilla(planillaId: string, totales: TotalesPorCategoria): Promise<void> {
  const { error } = await supabase
    .from("planillas_semanales")
    .update({
      estado: "ENVIADA",
      enviada_en: new Date().toISOString(),
      total_ordinarias: totales.ordinarias,
      total_extraordinarias: totales.extraordinarias,
      total_ausencias: totales.ausencias,
    })
    .eq("id", planillaId);

  if (error) throw error;
}
