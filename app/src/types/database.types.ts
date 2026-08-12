// Tipos manuales que reflejan supabase/schema.sql (modelo completo, 22 tablas).
// Si más adelante instalas la CLI de Supabase, puedes regenerarlos con:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
//
// Nota: cada tabla necesita "Relationships: []" y el schema "Views"/"Functions" (aunque estén vacíos)
// porque @supabase/supabase-js valida la forma completa de GenericSchema/GenericTable al inferir tipos;
// si falta alguno de estos campos, TypeScript no logra inferir el tipo de fila y cae a `never`.

export type PeriodoEstado = "PROGRAMADO" | "ABIERTO" | "EN_CORRECCION" | "CERRADO" | "REABIERTO" | "BLOQUEADO";
export type PlanillaEstado = "BORRADOR" | "ENVIADA" | "DEVUELTA" | "APROBADA" | "REABIERTA" | "BLOQUEADA";
export type AprobacionAccion = "ENVIADA" | "APROBADA" | "DEVUELTA" | "REABIERTA" | "ANULADA";
export type RolCodigo = "TRABAJADOR" | "ADMINISTRADOR" | "LECTOR" | "SUPER_ADMIN";

export interface Database {
  public: {
    Tables: {
      areas: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          activo: boolean;
          creado_en: string;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["areas"]["Insert"]>;
        Relationships: [];
      };
      cargos: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          activo: boolean;
          creado_en: string;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["cargos"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          descripcion: string | null;
          activo: boolean;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          descripcion?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      trabajadores: {
        Row: {
          id: string;
          auth_user_id: string | null;
          rut: string | null;
          nombres: string | null;
          apellidos: string | null;
          correo_corporativo: string;
          cargo_id: string | null;
          area_id: string | null;
          jefatura: string | null;
          fecha_ingreso: string | null;
          activo: boolean;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          rut?: string | null;
          nombres?: string | null;
          apellidos?: string | null;
          correo_corporativo: string;
          cargo_id?: string | null;
          area_id?: string | null;
          jefatura?: string | null;
          fecha_ingreso?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["trabajadores"]["Insert"]>;
        Relationships: [];
      };
      trabajador_roles: {
        Row: {
          id: string;
          trabajador_id: string;
          rol_id: string;
          asignado_por: string | null;
          asignado_en: string;
          activo: boolean;
        };
        Insert: {
          id?: string;
          trabajador_id: string;
          rol_id: string;
          asignado_por?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["trabajador_roles"]["Insert"]>;
        Relationships: [];
      };
      proyectos: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          descripcion: string | null;
          cliente_area: string | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          activo: boolean;
          creado_por: string | null;
          creado_en: string;
          actualizado_por: string | null;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          descripcion?: string | null;
          cliente_area?: string | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          activo?: boolean;
          creado_por?: string | null;
          actualizado_por?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["proyectos"]["Insert"]>;
        Relationships: [];
      };
      periodos: {
        Row: {
          id: string;
          nombre: string;
          fecha_inicio: string;
          fecha_fin: string;
          estado: PeriodoEstado;
          fecha_limite_administrador: string | null;
          creado_automaticamente: boolean;
          creado_en: string;
          cerrado_en: string | null;
          cerrado_por: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          fecha_inicio: string;
          fecha_fin: string;
          estado?: PeriodoEstado;
          fecha_limite_administrador?: string | null;
          creado_automaticamente?: boolean;
          cerrado_en?: string | null;
          cerrado_por?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["periodos"]["Insert"]>;
        Relationships: [];
      };
      semanas: {
        Row: {
          id: string;
          periodo_id: string;
          numero_semana: number;
          fecha_inicio: string;
          fecha_fin: string;
        };
        Insert: {
          id?: string;
          periodo_id: string;
          numero_semana: number;
          fecha_inicio: string;
          fecha_fin: string;
        };
        Update: Partial<Database["public"]["Tables"]["semanas"]["Insert"]>;
        Relationships: [];
      };
      jornadas: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          horas_semanales: number;
          activo: boolean;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          horas_semanales: number;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["jornadas"]["Insert"]>;
        Relationships: [];
      };
      jornada_dias: {
        Row: {
          id: string;
          jornada_id: string;
          dia_semana: number;
          horas_esperadas: number;
        };
        Insert: {
          id?: string;
          jornada_id: string;
          dia_semana: number;
          horas_esperadas?: number;
        };
        Update: Partial<Database["public"]["Tables"]["jornada_dias"]["Insert"]>;
        Relationships: [];
      };
      trabajador_jornadas: {
        Row: {
          id: string;
          trabajador_id: string;
          jornada_id: string;
          fecha_inicio: string;
          fecha_fin: string | null;
          activo: boolean;
        };
        Insert: {
          id?: string;
          trabajador_id: string;
          jornada_id: string;
          fecha_inicio: string;
          fecha_fin?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["trabajador_jornadas"]["Insert"]>;
        Relationships: [];
      };
      trabajador_proyectos_periodo: {
        Row: {
          id: string;
          trabajador_id: string;
          periodo_id: string;
          proyecto_id: string;
          orden_visual: number;
          seleccionado_en: string;
          activo: boolean;
        };
        Insert: {
          id?: string;
          trabajador_id: string;
          periodo_id: string;
          proyecto_id: string;
          orden_visual?: number;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["trabajador_proyectos_periodo"]["Insert"]>;
        Relationships: [];
      };
      asignaciones_proyecto: {
        Row: {
          id: string;
          proyecto_id: string;
          trabajador_id: string | null;
          administrador_id: string;
          fecha_inicio: string;
          fecha_fin: string | null;
          asignado_por: string | null;
          activo: boolean;
          creado_en: string;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          trabajador_id?: string | null;
          administrador_id: string;
          fecha_inicio?: string;
          fecha_fin?: string | null;
          asignado_por?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["asignaciones_proyecto"]["Insert"]>;
        Relationships: [];
      };
      lector_alcances: {
        Row: {
          id: string;
          lector_id: string;
          tipo_alcance: string;
          proyecto_id: string | null;
          trabajador_id: string | null;
          periodo_id: string | null;
          puede_exportar: boolean;
          asignado_por: string | null;
          activo: boolean;
        };
        Insert: {
          id?: string;
          lector_id: string;
          tipo_alcance: string;
          proyecto_id?: string | null;
          trabajador_id?: string | null;
          periodo_id?: string | null;
          puede_exportar?: boolean;
          asignado_por?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["lector_alcances"]["Insert"]>;
        Relationships: [];
      };
      planillas_semanales: {
        Row: {
          id: string;
          trabajador_id: string;
          semana_id: string;
          periodo_id: string;
          estado: PlanillaEstado;
          total_ordinarias: number;
          total_extraordinarias: number;
          total_ausencias: number;
          enviada_en: string | null;
          devuelta_en: string | null;
          aprobada_en: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          trabajador_id: string;
          semana_id: string;
          periodo_id: string;
          estado?: PlanillaEstado;
          total_ordinarias?: number;
          total_extraordinarias?: number;
          total_ausencias?: number;
          enviada_en?: string | null;
          devuelta_en?: string | null;
          aprobada_en?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["planillas_semanales"]["Insert"]>;
        Relationships: [];
      };
      feriados: {
        Row: {
          id: string;
          fecha: string;
          nombre: string;
          tipo: string | null;
          activo: boolean;
        };
        Insert: {
          id?: string;
          fecha: string;
          nombre: string;
          tipo?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["feriados"]["Insert"]>;
        Relationships: [];
      };
      tipos_registro: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          categoria: string;
          requiere_proyecto: boolean;
          completa_jornada: boolean;
          es_hora_extra: boolean;
          activo: boolean;
          orden_visual: number;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          categoria?: string;
          requiere_proyecto?: boolean;
          completa_jornada?: boolean;
          es_hora_extra?: boolean;
          activo?: boolean;
          orden_visual?: number;
        };
        Update: Partial<Database["public"]["Tables"]["tipos_registro"]["Insert"]>;
        Relationships: [];
      };
      registros_horas: {
        Row: {
          id: string;
          planilla_semanal_id: string;
          trabajador_id: string;
          fecha: string;
          proyecto_id: string | null;
          tipo_registro_id: string;
          horas: number;
          estado: string;
          creado_por: string | null;
          creado_en: string;
          actualizado_por: string | null;
          actualizado_en: string;
          anulado: boolean;
          anulado_por: string | null;
          anulado_en: string | null;
        };
        Insert: {
          id?: string;
          planilla_semanal_id: string;
          trabajador_id: string;
          fecha: string;
          proyecto_id?: string | null;
          tipo_registro_id: string;
          horas: number;
          estado?: string;
          creado_por?: string | null;
          actualizado_por?: string | null;
          anulado?: boolean;
          anulado_por?: string | null;
          anulado_en?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["registros_horas"]["Insert"]>;
        Relationships: [];
      };
      detalle_horas_extra: {
        Row: {
          id: string;
          registro_hora_id: string;
          modalidad: string;
          origen: string | null;
          requiere_revision: boolean;
          estado_revision: string;
          revisado_por: string | null;
          revisado_en: string | null;
        };
        Insert: {
          id?: string;
          registro_hora_id: string;
          modalidad: string;
          origen?: string | null;
          requiere_revision?: boolean;
          estado_revision?: string;
          revisado_por?: string | null;
          revisado_en?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["detalle_horas_extra"]["Insert"]>;
        Relationships: [];
      };
      aprobaciones_planilla: {
        Row: {
          id: string;
          planilla_semanal_id: string;
          administrador_id: string;
          accion: AprobacionAccion;
          comentario: string | null;
          fecha_hora: string;
          version_planilla: number;
        };
        Insert: {
          id?: string;
          planilla_semanal_id: string;
          administrador_id: string;
          accion: AprobacionAccion;
          comentario?: string | null;
          version_planilla?: number;
        };
        Update: Partial<Database["public"]["Tables"]["aprobaciones_planilla"]["Insert"]>;
        Relationships: [];
      };
      auditoria: {
        Row: {
          id: string;
          usuario_id: string | null;
          accion: string;
          tabla: string;
          registro_id: string | null;
          datos_anteriores: Record<string, unknown> | null;
          datos_nuevos: Record<string, unknown> | null;
          direccion_ip: string | null;
          user_agent: string | null;
          fecha_hora: string;
          correlation_id: string;
        };
        Insert: {
          id?: string;
          usuario_id?: string | null;
          accion: string;
          tabla: string;
          registro_id?: string | null;
          datos_anteriores?: Record<string, unknown> | null;
          datos_nuevos?: Record<string, unknown> | null;
          direccion_ip?: string | null;
          user_agent?: string | null;
          correlation_id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auditoria"]["Insert"]>;
        Relationships: [];
      };
      configuracion_sistema: {
        Row: {
          id: string;
          clave: string;
          valor: unknown;
          descripcion: string | null;
          actualizado_por: string | null;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          clave: string;
          valor: unknown;
          descripcion?: string | null;
          actualizado_por?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["configuracion_sistema"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Area = Database["public"]["Tables"]["areas"]["Row"];
export type Cargo = Database["public"]["Tables"]["cargos"]["Row"];
export type Rol = Database["public"]["Tables"]["roles"]["Row"];
export type Trabajador = Database["public"]["Tables"]["trabajadores"]["Row"];
export type TrabajadorRol = Database["public"]["Tables"]["trabajador_roles"]["Row"];
export type Proyecto = Database["public"]["Tables"]["proyectos"]["Row"];
export type Periodo = Database["public"]["Tables"]["periodos"]["Row"];
export type Semana = Database["public"]["Tables"]["semanas"]["Row"];
export type Jornada = Database["public"]["Tables"]["jornadas"]["Row"];
export type JornadaDia = Database["public"]["Tables"]["jornada_dias"]["Row"];
export type TrabajadorJornada = Database["public"]["Tables"]["trabajador_jornadas"]["Row"];
export type TrabajadorProyectoPeriodo = Database["public"]["Tables"]["trabajador_proyectos_periodo"]["Row"];
export type AsignacionProyecto = Database["public"]["Tables"]["asignaciones_proyecto"]["Row"];
export type LectorAlcance = Database["public"]["Tables"]["lector_alcances"]["Row"];
export type PlanillaSemanal = Database["public"]["Tables"]["planillas_semanales"]["Row"];
export type Feriado = Database["public"]["Tables"]["feriados"]["Row"];
export type TipoRegistro = Database["public"]["Tables"]["tipos_registro"]["Row"];
export type RegistroHoras = Database["public"]["Tables"]["registros_horas"]["Row"];
export type DetalleHorasExtra = Database["public"]["Tables"]["detalle_horas_extra"]["Row"];
export type AprobacionPlanilla = Database["public"]["Tables"]["aprobaciones_planilla"]["Row"];
export type Auditoria = Database["public"]["Tables"]["auditoria"]["Row"];
export type ConfiguracionSistema = Database["public"]["Tables"]["configuracion_sistema"]["Row"];
