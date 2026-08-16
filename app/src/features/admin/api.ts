import { supabase } from "@/lib/supabaseClient";
import type { Area, Cargo, Jornada, JornadaDia, Proyecto, Rol, Trabajador, TrabajadorRol } from "@/types/database.types";

// --- áreas ---
export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase.from("areas").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

/** Busca un área por nombre (sin distinguir mayúsculas); si no existe, la crea. */
export async function obtenerOCrearArea(nombre: string): Promise<string> {
  return obtenerOCrearCatalogo("areas", nombre, 20);
}

// --- cargos ---
export async function fetchCargos(): Promise<Cargo[]> {
  const { data, error } = await supabase.from("cargos").select("*").order("nombre");
  if (error) throw error;
  return data ?? [];
}

/** Busca un cargo por nombre (sin distinguir mayúsculas); si no existe, lo crea. */
export async function obtenerOCrearCargo(nombre: string): Promise<string> {
  return obtenerOCrearCatalogo("cargos", nombre, 30);
}

function generarCodigoCatalogo(nombre: string, maxLen: number): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (base || "GEN").slice(0, maxLen);
}

async function obtenerOCrearCatalogo(tabla: "areas" | "cargos", nombreCrudo: string, maxLenCodigo: number): Promise<string> {
  const nombre = nombreCrudo.trim();

  const { data: existentes, error: buscarError } = await supabase
    .from(tabla)
    .select("id")
    .ilike("nombre", nombre)
    .limit(1);
  if (buscarError) throw buscarError;
  if (existentes?.length) return existentes[0].id;

  const codigo = generarCodigoCatalogo(nombre, maxLenCodigo);
  const { data, error } = await supabase.from(tabla).insert({ codigo, nombre, activo: true }).select("id").single();
  if (!error) return data.id;

  if (error.code === "23505") {
    const codigoAlterno = `${codigo}_${Date.now().toString(36).slice(-4)}`.slice(0, maxLenCodigo);
    const { data: reintento, error: reintentoError } = await supabase
      .from(tabla)
      .insert({ codigo: codigoAlterno, nombre, activo: true })
      .select("id")
      .single();
    if (reintentoError) throw reintentoError;
    return reintento.id;
  }
  throw error;
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
  cliente_area?: string | null;
  activo: boolean;
}): Promise<void> {
  const { error } = await supabase.from("proyectos").upsert(proyecto);
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

/** Roles activos de todos los trabajadores, para mostrar en la lista sin abrir cada uno. */
export async function fetchTodosTrabajadorRoles(): Promise<TrabajadorRol[]> {
  const { data, error } = await supabase.from("trabajador_roles").select("*").eq("activo", true);
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

export interface DatosTrabajador {
  rut: string;
  nombres: string;
  apellidos: string;
  correo_corporativo: string;
  area_id: string | null;
  cargo_id: string | null;
  jefatura: string | null;
}

export async function actualizarTrabajador(id: string, datos: DatosTrabajador): Promise<void> {
  const { error } = await supabase.from("trabajadores").update(datos).eq("id", id);
  if (error) throw error;
}

/** "Elimina" un trabajador sin borrar su fila (queda inactivo, conserva su historial). */
export async function setTrabajadorActivo(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from("trabajadores").update({ activo }).eq("id", id);
  if (error) throw error;
}

export interface NuevoTrabajador {
  rut: string;
  nombres: string;
  apellidos: string;
  correo_corporativo: string;
  area_id: string | null;
  cargo_id: string | null;
  jefatura: string | null;
  rolIds: string[];
}

/** Crea un trabajador (sin cuenta de acceso todavía) y le asigna los roles seleccionados. */
export async function crearTrabajador(nuevo: NuevoTrabajador): Promise<Trabajador> {
  const { rolIds, ...datos } = nuevo;

  const { data, error } = await supabase.from("trabajadores").insert(datos).select("*").single();
  if (error) throw error;

  if (rolIds.length) {
    const { error: rolesError } = await supabase
      .from("trabajador_roles")
      .insert(rolIds.map((rol_id) => ({ trabajador_id: data.id, rol_id, activo: true })));
    if (rolesError) throw rolesError;
  }

  return data;
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
