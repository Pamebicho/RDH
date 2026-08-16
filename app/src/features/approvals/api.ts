import { supabase } from "@/lib/supabaseClient";
import type { AprobacionPlanilla, Periodo, PlanillaSemanal, Trabajador } from "@/types/database.types";

/** Planillas ENVIADA visibles para el administrador actual (RLS ya limita a sus proyectos). */
export async function fetchPlanillasEnviadas(): Promise<PlanillaSemanal[]> {
  const { data, error } = await supabase
    .from("planillas_semanales")
    .select("*")
    .eq("estado", "ENVIADA")
    .order("enviada_en", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchTrabajadoresPorIds(ids: string[]): Promise<Trabajador[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("trabajadores").select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPeriodosPorIds(ids: string[]): Promise<Periodo[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("periodos").select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function fetchHistorialAprobacionesMultiple(planillaIds: string[]): Promise<AprobacionPlanilla[]> {
  if (!planillaIds.length) return [];
  const { data, error } = await supabase
    .from("aprobaciones_planilla")
    .select("*")
    .in("planilla_semanal_id", planillaIds)
    .order("fecha_hora", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function aprobarPlanilla(planillaId: string, administradorId: string): Promise<void> {
  const { error: updateError } = await supabase
    .from("planillas_semanales")
    .update({ estado: "APROBADA", aprobada_en: new Date().toISOString() })
    .eq("id", planillaId);

  if (updateError) throw updateError;

  const { error: insertError } = await supabase.from("aprobaciones_planilla").insert({
    planilla_semanal_id: planillaId,
    administrador_id: administradorId,
    accion: "APROBADA",
  });

  if (insertError) throw insertError;
}

export async function devolverPlanilla(
  planillaId: string,
  administradorId: string,
  comentario: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from("planillas_semanales")
    .update({ estado: "DEVUELTA", devuelta_en: new Date().toISOString() })
    .eq("id", planillaId);

  if (updateError) throw updateError;

  const { error: insertError } = await supabase.from("aprobaciones_planilla").insert({
    planilla_semanal_id: planillaId,
    administrador_id: administradorId,
    accion: "DEVUELTA",
    comentario,
  });

  if (insertError) throw insertError;
}
