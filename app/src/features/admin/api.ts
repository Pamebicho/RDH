import { supabase } from "@/lib/supabaseClient";
import type {
  Area,
  AsignacionProyecto,
  Cargo,
  Feriado,
  Jornada,
  JornadaDia,
  Proyecto,
  Rol,
  TipoRegistro,
  Trabajador,
  TrabajadorRol,
} from "@/types/database.types";

// --- áreas ---
export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase.from("areas").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function upsertArea(area: { id?: string; codigo: string; nombre: string; activo: boolean }): Promise<void> {
  const { error } = await supabase.from("areas").upsert(area);
  if (error) throw error;
}

// --- cargos ---
export async function fetchCargos(): Promise<Cargo[]> {
  const { data, error } = await supabase.from("cargos").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function upsertCargo(cargo: { id?: string; codigo: string; nombre: string; activo: boolean }): Promise<void> {
  const { error } = await supabase.from("cargos").upsert(cargo);
  if (error) throw error;
}

// --- proyectos ---
export async function fetchProyectos(): Promise<Proyecto[]> {
  const { data, error } = await supabase.from("proyectos").select("*").order("codigo");
  if (error) throw error;
  return data ?? [];
}

export async function upsertProyecto(proyecto: {
  id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}): Promise<void> {
  const { error } = await supabase.from("proyectos").upsert(proyecto);
  if (error) throw error;
}

// --- feriados ---
export async function fetchFeriados(): Promise<Feriado[]> {
  const { data, error } = await supabase.from("feriados").select("*").order("fecha");
  if (error) throw error;
  return data ?? [];
}

export async function upsertFeriado(feriado: {
  id?: string;
  fecha: string;
  nombre: string;
  tipo?: string | null;
  activo: boolean;
}): Promise<void> {
  const { error } = await supabase.from("feriados").upsert(feriado);
  if (error) throw error;
}

// --- tipos_registro ---
export async function fetchTiposRegistro(): Promise<TipoRegistro[]> {
  const { data, error } = await supabase.from("tipos_registro").select("*").order("orden_visual");
  if (error) throw error;
  return data ?? [];
}

export async function upsertTipoRegistro(tipo: {
  id?: string;
  codigo: string;
  nombre: string;
  categoria: string;
  requiere_proyecto: boolean;
  es_hora_extra: boolean;
  activo: boolean;
}): Promise<void> {
  const { error } = await supabase.from("tipos_registro").upsert(tipo);
  if (error) throw error;
}

// --- jornadas ---
export async function fetchJornadas(): Promise<Jornada[]> {
  const { data, error } = await supabase.from("jornadas").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function fetchJornadaDias(jornadaId: string): Promise<JornadaDia[]> {
  const { data, error } = await supabase
    .from("jornada_dias")
    .select("*")
    .eq("jornada_id", jornadaId)
    .order("dia_semana");

  if (error) throw error;
  return data ?? [];
}

export async function upsertJornadaDia(dia: { jornada_id: string; dia_semana: number; horas_esperadas: number }): Promise<void> {
  const { error } = await supabase
    .from("jornada_dias")
    .upsert(dia, { onConflict: "jornada_id,dia_semana" });
  if (error) throw error;
}

// --- trabajadores, roles y asignaciones ---
export async function fetchTrabajadores(): Promise<Trabajador[]> {
  const { data, error } = await supabase.from("trabajadores").select("*").order("correo_corporativo");
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoles(): Promise<Rol[]> {
  const { data, error } = await supabase.from("roles").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrabajadorRoles(trabajadorId: string): Promise<TrabajadorRol[]> {
  const { data, error } = await supabase
    .from("trabajador_roles")
    .select("*")
    .eq("trabajador_id", trabajadorId)
    .eq("activo", true);

  if (error) throw error;
  return data ?? [];
}

export async function asignarRol(trabajadorId: string, rolId: string): Promise<void> {
  const { error } = await supabase
    .from("trabajador_roles")
    .upsert({ trabajador_id: trabajadorId, rol_id: rolId, activo: true }, { onConflict: "trabajador_id,rol_id" });
  if (error) throw error;
}

export async function revocarRol(trabajadorId: string, rolId: string): Promise<void> {
  const { error } = await supabase
    .from("trabajador_roles")
    .update({ activo: false })
    .eq("trabajador_id", trabajadorId)
    .eq("rol_id", rolId);
  if (error) throw error;
}

export async function fetchAsignacionesDeProyecto(proyectoId: string): Promise<AsignacionProyecto[]> {
  const { data, error } = await supabase
    .from("asignaciones_proyecto")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("activo", true);

  if (error) throw error;
  return data ?? [];
}

export async function asignarAdministrador(proyectoId: string, administradorId: string): Promise<void> {
  const { error } = await supabase.from("asignaciones_proyecto").insert({
    proyecto_id: proyectoId,
    administrador_id: administradorId,
  });
  if (error) throw error;
}

export async function revocarAsignacion(asignacionId: string): Promise<void> {
  const { error } = await supabase
    .from("asignaciones_proyecto")
    .update({ activo: false })
    .eq("id", asignacionId);
  if (error) throw error;
}
