import { supabase } from "@/lib/supabaseClient";

export interface DevolucionNotificacion {
  periodoId: string;
  periodoNombre: string;
  comentario: string | null;
  fechaHora: string | null;
}

/**
 * Períodos del trabajador actual con al menos una semana en estado DEVUELTA, junto con el
 * comentario más reciente que dejó el administrador al devolverla. RLS ya limita esto a las
 * propias planillas del trabajador (no requiere filtrar por trabajador_id acá para seguridad,
 * pero igual lo hacemos explícito para no depender solo de RLS en la consulta).
 */
export async function fetchDevolucionesPendientes(trabajadorId: string): Promise<DevolucionNotificacion[]> {
  const { data: planillas, error: planillasError } = await supabase
    .from("planillas_semanales")
    .select("id, periodo_id")
    .eq("trabajador_id", trabajadorId)
    .eq("estado", "DEVUELTA");

  if (planillasError) throw planillasError;
  if (!planillas.length) return [];

  const planillaIds = planillas.map((p) => p.id);
  const periodoIds = [...new Set(planillas.map((p) => p.periodo_id))];

  const [{ data: periodos, error: periodosError }, { data: aprobaciones, error: aprobacionesError }] =
    await Promise.all([
      supabase.from("periodos").select("id, nombre").in("id", periodoIds),
      supabase
        .from("aprobaciones_planilla")
        .select("planilla_semanal_id, comentario, fecha_hora")
        .in("planilla_semanal_id", planillaIds)
        .eq("accion", "DEVUELTA")
        .order("fecha_hora", { ascending: false }),
    ]);

  if (periodosError) throw periodosError;
  if (aprobacionesError) throw aprobacionesError;

  const periodoIdPorPlanillaId = new Map(planillas.map((p) => [p.id, p.periodo_id]));
  const nombrePorPeriodoId = new Map((periodos ?? []).map((p) => [p.id, p.nombre]));

  const porPeriodo = new Map<string, DevolucionNotificacion>();
  for (const aprobacion of aprobaciones ?? []) {
    const periodoId = periodoIdPorPlanillaId.get(aprobacion.planilla_semanal_id);
    if (!periodoId || porPeriodo.has(periodoId)) continue; // ya viene ordenado desc: la primera es la más reciente

    porPeriodo.set(periodoId, {
      periodoId,
      periodoNombre: nombrePorPeriodoId.get(periodoId) ?? "",
      comentario: aprobacion.comentario,
      fechaHora: aprobacion.fecha_hora,
    });
  }

  return [...porPeriodo.values()].sort((a, b) => (b.fechaHora ?? "").localeCompare(a.fechaHora ?? ""));
}
