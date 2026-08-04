import { supabase } from "@/lib/supabaseClient";
import type { CostCenter, DailyNote, Period, PeriodDefinition, TimeEntry } from "@/types/database.types";

export async function fetchPeriodDefinitions(): Promise<PeriodDefinition[]> {
  const { data, error } = await supabase
    .from("period_definitions")
    .select("*")
    .order("period", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchCostCenters(): Promise<CostCenter[]> {
  const { data, error } = await supabase
    .from("cost_centers")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error) throw error;
  return data ?? [];
}

export async function fetchPeriod(userId: string, period: string): Promise<Period | null> {
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Obtiene el período del usuario o lo crea (con todos los centros activos preseleccionados). */
export async function ensurePeriod(userId: string, period: string): Promise<Period> {
  const existing = await fetchPeriod(userId, period);
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("periods")
    .insert({ user_id: userId, period })
    .select("*")
    .single();

  if (insertError) throw insertError;

  const centers = await fetchCostCenters();
  if (centers.length) {
    const { error: seedError } = await supabase
      .from("period_cost_centers")
      .insert(centers.map((center) => ({ period_id: created.id, cost_center_id: center.id })));

    if (seedError) throw seedError;
  }

  return created;
}

export async function fetchSelectedCenterIds(periodId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("period_cost_centers")
    .select("cost_center_id")
    .eq("period_id", periodId);

  if (error) throw error;
  return (data ?? []).map((row) => row.cost_center_id);
}

export async function updateSelectedCenterIds(periodId: string, centerIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("period_cost_centers")
    .delete()
    .eq("period_id", periodId);

  if (deleteError) throw deleteError;
  if (!centerIds.length) return;

  const { error: insertError } = await supabase
    .from("period_cost_centers")
    .insert(centerIds.map((centerId) => ({ period_id: periodId, cost_center_id: centerId })));

  if (insertError) throw insertError;
}

export async function fetchTimeEntries(periodId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase.from("time_entries").select("*").eq("period_id", periodId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDailyNotes(periodId: string): Promise<DailyNote[]> {
  const { data, error } = await supabase.from("daily_notes").select("*").eq("period_id", periodId);
  if (error) throw error;
  return data ?? [];
}

export interface TimeEntryUpsert {
  period_id: string;
  entry_date: string;
  cost_center_id: string;
  hours: number;
}

export async function upsertTimeEntries(rows: TimeEntryUpsert[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase
    .from("time_entries")
    .upsert(rows, { onConflict: "period_id,entry_date,cost_center_id" });

  if (error) throw error;
}

export interface DailyNoteUpsert {
  period_id: string;
  entry_date: string;
  observation: string;
}

export async function upsertDailyNotes(rows: DailyNoteUpsert[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase
    .from("daily_notes")
    .upsert(rows, { onConflict: "period_id,entry_date" });

  if (error) throw error;
}

export async function submitPeriod(periodId: string): Promise<void> {
  const { error } = await supabase
    .from("periods")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", periodId);

  if (error) throw error;
}
