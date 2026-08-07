import { supabase } from "@/lib/supabaseClient";

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
