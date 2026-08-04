// Tipos manuales que reflejan supabase/schema.sql.
// Si más adelante instalas la CLI de Supabase, puedes regenerarlos con:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
//
// Nota: cada tabla necesita "Relationships: []" y el schema "Views"/"Functions" (aunque estén vacíos)
// porque @supabase/supabase-js valida la forma completa de GenericSchema/GenericTable al inferir tipos;
// si falta alguno de estos campos, TypeScript no logra inferir el tipo de fila y cae a `never`.

export type PeriodStatus = "editing" | "submitted";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          area: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      cost_centers: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
        };
        Insert: Database["public"]["Tables"]["cost_centers"]["Row"];
        Update: Partial<Database["public"]["Tables"]["cost_centers"]["Row"]>;
        Relationships: [];
      };
      period_definitions: {
        Row: {
          period: string;
          label: string;
          expected_hours: number;
          deadline: string;
        };
        Insert: Database["public"]["Tables"]["period_definitions"]["Row"];
        Update: Partial<Database["public"]["Tables"]["period_definitions"]["Row"]>;
        Relationships: [];
      };
      periods: {
        Row: {
          id: string;
          user_id: string;
          period: string;
          status: PeriodStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period: string;
          status?: PeriodStatus;
          submitted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["periods"]["Insert"]>;
        Relationships: [];
      };
      period_cost_centers: {
        Row: {
          period_id: string;
          cost_center_id: string;
        };
        Insert: Database["public"]["Tables"]["period_cost_centers"]["Row"];
        Update: Partial<Database["public"]["Tables"]["period_cost_centers"]["Row"]>;
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          period_id: string;
          entry_date: string;
          cost_center_id: string;
          hours: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_id: string;
          entry_date: string;
          cost_center_id: string;
          hours: number;
        };
        Update: Partial<Database["public"]["Tables"]["time_entries"]["Insert"]>;
        Relationships: [];
      };
      daily_notes: {
        Row: {
          period_id: string;
          entry_date: string;
          observation: string;
        };
        Insert: Database["public"]["Tables"]["daily_notes"]["Row"];
        Update: Partial<Database["public"]["Tables"]["daily_notes"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type CostCenter = Database["public"]["Tables"]["cost_centers"]["Row"];
export type PeriodDefinition = Database["public"]["Tables"]["period_definitions"]["Row"];
export type Period = Database["public"]["Tables"]["periods"]["Row"];
export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
export type DailyNote = Database["public"]["Tables"]["daily_notes"]["Row"];
