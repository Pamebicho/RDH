import { supabase } from "@/lib/supabaseClient";
import type { PlanillaSemanal } from "@/types/database.types";

/** RLS ya limita el resultado a lo que el rol del usuario actual puede ver. */
export async function fetchPlanillasPorPeriodo(periodoId: string): Promise<PlanillaSemanal[]> {
  const { data, error } = await supabase
    .from("planillas_semanales")
    .select("*")
    .eq("periodo_id", periodoId);

  if (error) throw error;
  return data ?? [];
}
