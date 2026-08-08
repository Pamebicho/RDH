import { supabase } from "@/lib/supabaseClient";
import type { PlanillaSemanal, RegistroHoras } from "@/types/database.types";

export async function fetchTrabajadoresActivosCount(): Promise<number> {
  const { count, error } = await supabase
    .from("trabajadores")
    .select("*", { count: "exact", head: true })
    .eq("activo", true);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchCentrosCostoActivosCount(): Promise<number> {
  const { count, error } = await supabase
    .from("proyectos")
    .select("*", { count: "exact", head: true })
    .eq("activo", true);

  if (error) throw error;
  return count ?? 0;
}

/** RLS ya limita esto a SUPER_ADMIN (ve todas) o ADMINISTRADOR (solo las de sus proyectos). */
export async function fetchPlanillasPendientesCount(): Promise<number> {
  const { count, error } = await supabase
    .from("planillas_semanales")
    .select("*", { count: "exact", head: true })
    .eq("estado", "ENVIADA");

  if (error) throw error;
  return count ?? 0;
}

export async function fetchPlanillasDelPeriodo(periodoId: string): Promise<PlanillaSemanal[]> {
  const { data, error } = await supabase.from("planillas_semanales").select("*").eq("periodo_id", periodoId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRegistrosPorPlanillas(planillaIds: string[]): Promise<RegistroHoras[]> {
  if (!planillaIds.length) return [];
  const { data, error } = await supabase
    .from("registros_horas")
    .select("*")
    .in("planilla_semanal_id", planillaIds)
    .eq("anulado", false);

  if (error) throw error;
  return data ?? [];
}
