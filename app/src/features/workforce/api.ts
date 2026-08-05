import { supabase } from "@/lib/supabaseClient";
import type { RolCodigo, Trabajador } from "@/types/database.types";

export async function fetchTrabajadorPorAuthId(authUserId: string): Promise<Trabajador | null> {
  const { data, error } = await supabase
    .from("trabajadores")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Se hace en dos consultas (sin "select" embebido de PostgREST) porque el tipo
// Database define Relationships: [] para todas las tablas, así que el cliente no
// puede inferir la forma de un join embebido — dos queries simples es más robusto.
export async function fetchRolesActivos(trabajadorId: string): Promise<RolCodigo[]> {
  const { data: asignaciones, error: asignacionesError } = await supabase
    .from("trabajador_roles")
    .select("rol_id")
    .eq("trabajador_id", trabajadorId)
    .eq("activo", true);

  if (asignacionesError) throw asignacionesError;
  if (!asignaciones?.length) return [];

  const rolIds = asignaciones.map((row) => row.rol_id);

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("codigo")
    .in("id", rolIds)
    .eq("activo", true);

  if (rolesError) throw rolesError;

  return (roles ?? []).map((rol) => rol.codigo as RolCodigo);
}
