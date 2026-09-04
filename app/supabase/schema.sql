-- =============================================================================
-- Registro de Horas Krontec — esquema Supabase (Postgres)
-- Modelo completo (22 tablas) según Tablas_Modelo_Base_Datos_Registro_Horas_Krontec.docx
--
-- Reemplaza por completo al esquema simple v1 (profiles/cost_centers/periods/...).
-- Ejecutar completo en el SQL editor del proyecto Supabase. ADVERTENCIA: al empezar
-- borra las tablas del esquema v1 y sus datos — solo correr si aceptas perder los
-- datos de prueba cargados con la versión anterior.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Limpieza del esquema v1
-- ---------------------------------------------------------------------------
drop table if exists public.daily_notes cascade;
drop table if exists public.time_entries cascade;
drop table if exists public.period_cost_centers cascade;
drop table if exists public.periods cascade;
drop table if exists public.period_definitions cascade;
drop table if exists public.cost_centers cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Función utilitaria: mantener actualizado_en al día
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. areas
-- =============================================================================
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(20) not null unique,
  nombre varchar(100) not null unique,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- =============================================================================
-- 2. cargos
-- =============================================================================
create table if not exists public.cargos (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(30) not null unique,
  nombre varchar(100) not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- =============================================================================
-- 3. roles
-- =============================================================================
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(30) not null unique,
  nombre varchar(80) not null,
  descripcion text,
  activo boolean not null default true
);

-- =============================================================================
-- 4. trabajadores
-- =============================================================================
create table if not exists public.trabajadores (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete cascade,
  rut varchar(12) unique,
  nombres varchar(100),
  apellidos varchar(100),
  correo_corporativo varchar(150) not null unique,
  cargo_id uuid references public.cargos (id),
  area_id uuid references public.areas (id),
  jefatura varchar(150),
  fecha_ingreso date,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Migración: reemplaza el antiguo jefe_contrato_id (FK a otro trabajador, vía selector) por un
-- campo de texto libre "Jefatura" (se escribe el nombre, no se elige de una lista).
alter table public.trabajadores drop column if exists jefe_contrato_id;
alter table public.trabajadores drop column if exists administrador_contrato;
alter table public.trabajadores add column if not exists jefatura varchar(150);

create unique index if not exists idx_trabajadores_auth_user on public.trabajadores (auth_user_id);

drop trigger if exists trabajadores_set_updated_at on public.trabajadores;
create trigger trabajadores_set_updated_at
  before update on public.trabajadores
  for each row execute procedure public.set_updated_at();

-- =============================================================================
-- 5. trabajador_roles
-- =============================================================================
create table if not exists public.trabajador_roles (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores (id) on delete cascade,
  rol_id uuid not null references public.roles (id),
  asignado_por uuid references public.trabajadores (id),
  asignado_en timestamptz not null default now(),
  activo boolean not null default true,
  unique (trabajador_id, rol_id)
);

-- =============================================================================
-- 6. proyectos (centros de costo)
-- =============================================================================
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(20) not null unique,
  nombre varchar(250) not null,
  descripcion text,
  fecha_inicio date,
  fecha_fin date,
  activo boolean not null default true,
  creado_por uuid references public.trabajadores (id),
  creado_en timestamptz not null default now(),
  actualizado_por uuid references public.trabajadores (id),
  actualizado_en timestamptz not null default now()
);

drop trigger if exists proyectos_set_updated_at on public.proyectos;
create trigger proyectos_set_updated_at
  before update on public.proyectos
  for each row execute procedure public.set_updated_at();

-- =============================================================================
-- 7. periodos
-- =============================================================================
create table if not exists public.periodos (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(100) not null unique,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado varchar(20) not null default 'PROGRAMADO'
    check (estado in ('PROGRAMADO', 'ABIERTO', 'EN_CORRECCION', 'CERRADO', 'REABIERTO', 'BLOQUEADO')),
  fecha_limite_administrador date,
  creado_automaticamente boolean not null default false,
  creado_en timestamptz not null default now(),
  cerrado_en timestamptz,
  cerrado_por uuid references public.trabajadores (id)
);

-- =============================================================================
-- 8. semanas
-- =============================================================================
create table if not exists public.semanas (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.periodos (id) on delete cascade,
  numero_semana smallint not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  unique (periodo_id, numero_semana)
);

create index if not exists idx_semanas_periodo on public.semanas (periodo_id);

-- Genera las semanas que cubren un período; se puede volver a llamar para regenerar.
-- Cada semana se muestra completa de lunes a domingo (7 días), aunque la primera o la
-- última se asomen un poco fuera de las fechas exactas del período — así el trabajador
-- siempre ve la semana entera en vez de un tramo cortado de 2 o 3 días.
-- Las semanas que ya tienen una planilla_semanal cargada NO se borran (rompería la FK
-- y perdería datos): esas se actualizan in-place (mismo id, fechas nuevas) vía upsert
-- por (periodo_id, numero_semana); solo se eliminan las semanas "vacías" sobrantes.
create or replace function public.generar_semanas_periodo(p_periodo_id uuid)
returns void
language plpgsql
as $$
declare
  v_inicio date;
  v_fin date;
  v_cursor_lunes date;
  v_numero smallint := 1;
begin
  select fecha_inicio, fecha_fin into v_inicio, v_fin
  from public.periodos where id = p_periodo_id;

  if v_inicio is null then
    raise exception 'Periodo % no encontrado', p_periodo_id;
  end if;

  delete from public.semanas s
  where s.periodo_id = p_periodo_id
    and not exists (select 1 from public.planillas_semanales p where p.semana_id = s.id);

  v_cursor_lunes := v_inicio - ((extract(isodow from v_inicio)::int - 1));

  while v_cursor_lunes <= v_fin loop
    insert into public.semanas (periodo_id, numero_semana, fecha_inicio, fecha_fin)
    values (p_periodo_id, v_numero, v_cursor_lunes, v_cursor_lunes + 6)
    on conflict (periodo_id, numero_semana)
    do update set fecha_inicio = excluded.fecha_inicio, fecha_fin = excluded.fecha_fin;

    v_cursor_lunes := v_cursor_lunes + 7;
    v_numero := v_numero + 1;
  end loop;
end;
$$;

-- Crea (o actualiza) el período mensual con ciclo fijo "día 25 al día 24 del mes
-- siguiente" que contiene la fecha dada, y genera sus semanas. p_fecha puede ser
-- cualquier día dentro del ciclo deseado.
create or replace function public.generar_periodo_ciclo_25_24(p_fecha date)
returns uuid
language plpgsql
as $$
declare
  v_inicio date;
  v_fin date;
  v_nombre_mes text;
  v_id uuid;
begin
  if extract(day from p_fecha) >= 25 then
    v_inicio := make_date(extract(year from p_fecha)::int, extract(month from p_fecha)::int, 25);
  else
    v_inicio := make_date(extract(year from p_fecha)::int, extract(month from p_fecha)::int, 25) - interval '1 month';
  end if;

  v_fin := (v_inicio + interval '1 month' - interval '1 day')::date;

  -- Nombre en español fijo (no depende del locale configurado en el servidor de Postgres).
  v_nombre_mes := (array[
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ])[extract(month from v_fin)::int] || ' ' || extract(year from v_fin)::text;

  insert into public.periodos (nombre, fecha_inicio, fecha_fin, estado, creado_automaticamente)
  values (v_nombre_mes, v_inicio, v_fin, 'ABIERTO', true)
  on conflict (nombre) do update set fecha_inicio = excluded.fecha_inicio, fecha_fin = excluded.fecha_fin
  returning id into v_id;

  perform public.generar_semanas_periodo(v_id);

  return v_id;
end;
$$;

-- =============================================================================
-- 9. jornadas
-- =============================================================================
create table if not exists public.jornadas (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(30) not null unique,
  nombre varchar(100) not null,
  horas_semanales numeric(4, 1) not null,
  activo boolean not null default true
);

-- =============================================================================
-- 10. jornada_dias
-- =============================================================================
create table if not exists public.jornada_dias (
  id uuid primary key default gen_random_uuid(),
  jornada_id uuid not null references public.jornadas (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7), -- 1 lunes ... 7 domingo
  horas_esperadas numeric(3, 1) not null default 0,
  unique (jornada_id, dia_semana)
);

-- =============================================================================
-- 11. trabajador_jornadas
-- =============================================================================
create table if not exists public.trabajador_jornadas (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores (id) on delete cascade,
  jornada_id uuid not null references public.jornadas (id),
  fecha_inicio date not null,
  fecha_fin date,
  activo boolean not null default true
);

create index if not exists idx_trabajador_jornadas_trabajador on public.trabajador_jornadas (trabajador_id);

-- =============================================================================
-- 12. trabajador_proyectos_periodo
-- =============================================================================
create table if not exists public.trabajador_proyectos_periodo (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores (id) on delete cascade,
  periodo_id uuid not null references public.periodos (id) on delete cascade,
  proyecto_id uuid not null references public.proyectos (id),
  orden_visual smallint not null default 0,
  seleccionado_en timestamptz not null default now(),
  activo boolean not null default true,
  unique (trabajador_id, periodo_id, proyecto_id)
);

create index if not exists idx_tpp_trabajador_periodo on public.trabajador_proyectos_periodo (trabajador_id, periodo_id);

-- =============================================================================
-- 13. asignaciones_proyecto
-- =============================================================================
create table if not exists public.asignaciones_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  trabajador_id uuid references public.trabajadores (id),
  administrador_id uuid not null references public.trabajadores (id),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  asignado_por uuid references public.trabajadores (id),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists idx_asignaciones_proyecto on public.asignaciones_proyecto (proyecto_id);
create index if not exists idx_asignaciones_administrador on public.asignaciones_proyecto (administrador_id);

-- =============================================================================
-- 14. lector_alcances
-- =============================================================================
create table if not exists public.lector_alcances (
  id uuid primary key default gen_random_uuid(),
  lector_id uuid not null references public.trabajadores (id) on delete cascade,
  tipo_alcance varchar(30) not null,
  proyecto_id uuid references public.proyectos (id),
  trabajador_id uuid references public.trabajadores (id),
  periodo_id uuid references public.periodos (id),
  puede_exportar boolean not null default false,
  asignado_por uuid references public.trabajadores (id),
  activo boolean not null default true
);

create index if not exists idx_lector_alcances_lector on public.lector_alcances (lector_id);

-- =============================================================================
-- 15. planillas_semanales
-- =============================================================================
create table if not exists public.planillas_semanales (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores (id) on delete cascade,
  semana_id uuid not null references public.semanas (id),
  periodo_id uuid not null references public.periodos (id),
  estado varchar(20) not null default 'BORRADOR'
    check (estado in ('BORRADOR', 'ENVIADA', 'DEVUELTA', 'APROBADA', 'REABIERTA', 'BLOQUEADA')),
  total_ordinarias numeric(6, 1) not null default 0,
  total_extraordinarias numeric(6, 1) not null default 0,
  total_ausencias numeric(6, 1) not null default 0,
  enviada_en timestamptz,
  devuelta_en timestamptz,
  aprobada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (trabajador_id, semana_id, periodo_id)
);

create index if not exists idx_planillas_trabajador on public.planillas_semanales (trabajador_id);
create index if not exists idx_planillas_semana on public.planillas_semanales (semana_id);

drop trigger if exists planillas_set_updated_at on public.planillas_semanales;
create trigger planillas_set_updated_at
  before update on public.planillas_semanales
  for each row execute procedure public.set_updated_at();

-- =============================================================================
-- 16. feriados
-- =============================================================================
create table if not exists public.feriados (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  nombre varchar(150) not null,
  tipo varchar(30),
  activo boolean not null default true
);

-- =============================================================================
-- 17. tipos_registro
-- =============================================================================
create table if not exists public.tipos_registro (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(30) not null unique,
  nombre varchar(100) not null,
  categoria varchar(30) not null default 'TRABAJO',
  requiere_proyecto boolean not null default false,
  completa_jornada boolean not null default false,
  es_hora_extra boolean not null default false,
  activo boolean not null default true,
  orden_visual smallint not null default 0
);

-- =============================================================================
-- 18. registros_horas
-- =============================================================================
create table if not exists public.registros_horas (
  id uuid primary key default gen_random_uuid(),
  planilla_semanal_id uuid not null references public.planillas_semanales (id) on delete cascade,
  trabajador_id uuid not null references public.trabajadores (id),
  fecha date not null,
  proyecto_id uuid references public.proyectos (id),
  tipo_registro_id uuid not null references public.tipos_registro (id),
  horas numeric(4, 1) not null check (horas >= 0 and horas <= 24),
  estado varchar(20) not null default 'ACTIVO',
  creado_por uuid references public.trabajadores (id),
  creado_en timestamptz not null default now(),
  actualizado_por uuid references public.trabajadores (id),
  actualizado_en timestamptz not null default now(),
  anulado boolean not null default false,
  anulado_por uuid references public.trabajadores (id),
  anulado_en timestamptz,
  -- NULLs en proyecto_id no chocan entre sí en este UNIQUE (comportamiento estándar de
  -- Postgres); la capa de aplicación evita duplicados de tipos sin proyecto (VAC/LIC/
  -- PER/AUS/CAP) borrando e insertando la fila del día en vez de confiar solo en esto.
  unique (trabajador_id, fecha, tipo_registro_id, proyecto_id)
);

create index if not exists idx_registros_planilla on public.registros_horas (planilla_semanal_id);
create index if not exists idx_registros_trabajador_fecha on public.registros_horas (trabajador_id, fecha);

drop trigger if exists registros_set_updated_at on public.registros_horas;
create trigger registros_set_updated_at
  before update on public.registros_horas
  for each row execute procedure public.set_updated_at();

-- =============================================================================
-- 19. detalle_horas_extra
-- =============================================================================
create table if not exists public.detalle_horas_extra (
  id uuid primary key default gen_random_uuid(),
  registro_hora_id uuid not null unique references public.registros_horas (id) on delete cascade,
  modalidad varchar(30) not null,
  origen varchar(30),
  requiere_revision boolean not null default true,
  estado_revision varchar(20) not null default 'PENDIENTE',
  revisado_por uuid references public.trabajadores (id),
  revisado_en timestamptz
);

-- =============================================================================
-- 20. aprobaciones_planilla
-- =============================================================================
create table if not exists public.aprobaciones_planilla (
  id uuid primary key default gen_random_uuid(),
  planilla_semanal_id uuid not null references public.planillas_semanales (id) on delete cascade,
  administrador_id uuid not null references public.trabajadores (id),
  accion varchar(20) not null
    check (accion in ('ENVIADA', 'APROBADA', 'DEVUELTA', 'REABIERTA', 'ANULADA')),
  comentario text,
  fecha_hora timestamptz not null default now(),
  version_planilla integer not null default 1
);

create index if not exists idx_aprobaciones_planilla on public.aprobaciones_planilla (planilla_semanal_id);

-- =============================================================================
-- 21. auditoria
-- =============================================================================
create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.trabajadores (id),
  accion varchar(60) not null,
  tabla varchar(100) not null,
  registro_id uuid,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  direccion_ip inet,
  user_agent text,
  fecha_hora timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid()
);

create index if not exists idx_auditoria_tabla on public.auditoria (tabla, registro_id);

-- =============================================================================
-- 22. configuracion_sistema
-- =============================================================================
create table if not exists public.configuracion_sistema (
  id uuid primary key default gen_random_uuid(),
  clave varchar(100) not null unique,
  valor jsonb not null,
  descripcion text,
  actualizado_por uuid references public.trabajadores (id),
  actualizado_en timestamptz not null default now()
);

drop trigger if exists config_set_updated_at on public.configuracion_sistema;
create trigger config_set_updated_at
  before update on public.configuracion_sistema
  for each row execute procedure public.set_updated_at();

-- =============================================================================
-- Funciones helper para RLS (security definer: evitan recursión de RLS al
-- consultar tablas que ellas mismas protegen)
-- =============================================================================
create or replace function public.trabajador_actual_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.trabajadores where auth_user_id = auth.uid();
$$;

create or replace function public.tiene_rol(p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trabajador_roles tr
    join public.roles r on r.id = tr.rol_id
    where tr.trabajador_id = public.trabajador_actual_id()
      and tr.activo = true
      and r.codigo = p_codigo
      and r.activo = true
  );
$$;

create or replace function public.administra_proyecto(p_proyecto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.asignaciones_proyecto ap
    where ap.proyecto_id = p_proyecto_id
      and ap.administrador_id = public.trabajador_actual_id()
      and ap.activo = true
  );
$$;

create or replace function public.puede_ver_planilla(p_planilla_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.planillas_semanales p
    where p.id = p_planilla_id
      and (
        p.trabajador_id = public.trabajador_actual_id()
        or public.tiene_rol('SUPER_ADMIN')
        or exists (
          select 1 from public.registros_horas rh
          where rh.planilla_semanal_id = p.id
            and rh.proyecto_id is not null
            and public.administra_proyecto(rh.proyecto_id)
        )
      )
  );
$$;

-- Visibilidad de un LECTOR sobre una planilla según su fila en lector_alcances
-- (por trabajador completo, por período completo, o por proyecto presente en la planilla).
create or replace function public.lector_puede_ver_planilla(p_planilla_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planillas_semanales p
    join public.lector_alcances la
      on la.lector_id = public.trabajador_actual_id()
      and la.activo = true
    where p.id = p_planilla_id
      and (
        (la.tipo_alcance = 'TRABAJADOR' and la.trabajador_id = p.trabajador_id)
        or (la.tipo_alcance = 'PERIODO' and la.periodo_id = p.periodo_id)
        or (
          la.tipo_alcance = 'PROYECTO'
          and exists (
            select 1 from public.registros_horas rh
            where rh.planilla_semanal_id = p.id and rh.proyecto_id = la.proyecto_id
          )
        )
      )
  );
$$;

-- El trabajador dueño de la planilla solo puede insertar/editar/borrar sus registros_horas
-- mientras la planilla esté en un estado editable (BORRADOR o DEVUELTA). Antes esto solo se
-- validaba en la UI (isSubmitted deshabilita los inputs); nada impedía llamar directo a la
-- API de Supabase para editar una planilla ya ENVIADA o APROBADA.
create or replace function public.trabajador_puede_editar_planilla(p_planilla_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.planillas_semanales p
    where p.id = p_planilla_id
      and p.trabajador_id = public.trabajador_actual_id()
      and p.estado in ('BORRADOR', 'DEVUELTA')
  );
$$;

-- Un Administrador que gestiona el proyecto de la planilla solo puede transicionarla
-- (aprobar/devolver) mientras esté ENVIADA — coincide con el único flujo que usa la UI de
-- Aprobaciones (aprobarPlanilla/devolverPlanilla solo actúan sobre planillas ENVIADA).
create or replace function public.administrador_puede_transicionar_planilla(p_planilla_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.planillas_semanales p
    where p.id = p_planilla_id
      and p.estado = 'ENVIADA'
      and p.trabajador_id <> public.trabajador_actual_id()
      and exists (
        select 1 from public.registros_horas rh
        where rh.planilla_semanal_id = p.id
          and rh.proyecto_id is not null
          and public.administra_proyecto(rh.proyecto_id)
      )
  );
$$;

-- =============================================================================
-- Trigger: crear trabajador + rol TRABAJADOR al registrarse en Supabase Auth
-- =============================================================================
-- Un Super Admin puede pre-crear la fila de un trabajador (con RUT, área, cargo, roles, etc.)
-- antes de que esa persona tenga cuenta de acceso (auth_user_id queda null). Cuando esa persona
-- inicia sesión por primera vez con ese mismo correo, este trigger "reclama" esa fila existente
-- (le asigna el auth_user_id) en vez de fallar por el UNIQUE de correo_corporativo. Solo asigna
-- el rol TRABAJADOR por defecto si el trabajador todavía no tiene ningún rol asignado (para no
-- pisar los roles que un Super Admin ya haya elegido al pre-crearlo).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_trabajador_id uuid;
  v_rol_trabajador_id uuid;
  v_tiene_roles boolean;
begin
  insert into public.trabajadores (auth_user_id, correo_corporativo)
  values (new.id, new.email)
  on conflict (correo_corporativo) do update set auth_user_id = excluded.auth_user_id
  returning id into v_trabajador_id;

  select exists(
    select 1 from public.trabajador_roles where trabajador_id = v_trabajador_id
  ) into v_tiene_roles;

  if not v_tiene_roles then
    select id into v_rol_trabajador_id from public.roles where codigo = 'TRABAJADOR';

    if v_rol_trabajador_id is not null then
      insert into public.trabajador_roles (trabajador_id, rol_id, activo)
      values (v_trabajador_id, v_rol_trabajador_id, true);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- Trigger: registrar automáticamente cambios en auditoria (tablas sensibles)
-- =============================================================================
-- security definer: corre con los privilegios del dueño de la función (el dueño de la
-- tabla, exento de RLS), no con los del usuario autenticado. Por eso no existe una
-- política de insert para "authenticated" en auditoria más abajo: el cliente nunca
-- inserta filas de auditoría directamente, solo este trigger.
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.auditoria (usuario_id, accion, tabla, registro_id, datos_anteriores, datos_nuevos)
  values (
    public.trabajador_actual_id(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trabajadores_auditoria on public.trabajadores;
create trigger trabajadores_auditoria
  after insert or update or delete on public.trabajadores
  for each row execute procedure public.registrar_auditoria();

drop trigger if exists planillas_auditoria on public.planillas_semanales;
create trigger planillas_auditoria
  after insert or update or delete on public.planillas_semanales
  for each row execute procedure public.registrar_auditoria();

drop trigger if exists registros_auditoria on public.registros_horas;
create trigger registros_auditoria
  after insert or update or delete on public.registros_horas
  for each row execute procedure public.registrar_auditoria();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- --- Catálogos de solo lectura para autenticados, escritura solo SUPER_ADMIN ---
alter table public.areas enable row level security;
alter table public.cargos enable row level security;
alter table public.roles enable row level security;
alter table public.proyectos enable row level security;
alter table public.periodos enable row level security;
alter table public.semanas enable row level security;
alter table public.jornadas enable row level security;
alter table public.jornada_dias enable row level security;
alter table public.feriados enable row level security;
alter table public.tipos_registro enable row level security;

drop policy if exists "areas_select" on public.areas;
create policy "areas_select" on public.areas for select to authenticated using (true);
drop policy if exists "areas_write" on public.areas;
create policy "areas_write" on public.areas for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "cargos_select" on public.cargos;
create policy "cargos_select" on public.cargos for select to authenticated using (true);
drop policy if exists "cargos_write" on public.cargos;
create policy "cargos_write" on public.cargos for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "roles_select" on public.roles;
create policy "roles_select" on public.roles for select to authenticated using (true);
drop policy if exists "roles_write" on public.roles;
create policy "roles_write" on public.roles for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "proyectos_select" on public.proyectos;
create policy "proyectos_select" on public.proyectos for select to authenticated using (true);
drop policy if exists "proyectos_write" on public.proyectos;
create policy "proyectos_write" on public.proyectos for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "periodos_select" on public.periodos;
create policy "periodos_select" on public.periodos for select to authenticated using (true);
drop policy if exists "periodos_write" on public.periodos;
create policy "periodos_write" on public.periodos for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "semanas_select" on public.semanas;
create policy "semanas_select" on public.semanas for select to authenticated using (true);
drop policy if exists "semanas_write" on public.semanas;
create policy "semanas_write" on public.semanas for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "jornadas_select" on public.jornadas;
create policy "jornadas_select" on public.jornadas for select to authenticated using (true);
drop policy if exists "jornadas_write" on public.jornadas;
create policy "jornadas_write" on public.jornadas for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "jornada_dias_select" on public.jornada_dias;
create policy "jornada_dias_select" on public.jornada_dias for select to authenticated using (true);
drop policy if exists "jornada_dias_write" on public.jornada_dias;
create policy "jornada_dias_write" on public.jornada_dias for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "feriados_select" on public.feriados;
create policy "feriados_select" on public.feriados for select to authenticated using (true);
drop policy if exists "feriados_write" on public.feriados;
create policy "feriados_write" on public.feriados for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "tipos_registro_select" on public.tipos_registro;
create policy "tipos_registro_select" on public.tipos_registro for select to authenticated using (true);
drop policy if exists "tipos_registro_write" on public.tipos_registro;
create policy "tipos_registro_write" on public.tipos_registro for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

-- --- trabajadores ---
alter table public.trabajadores enable row level security;

-- Un trabajador siempre ve su propia fila; ADMINISTRADOR/LECTOR/SUPER_ADMIN necesitan ver
-- al resto (Aprobaciones, Reportes, Administración, RRHH). La app hoy no tiene una pantalla
-- de "directorio" para el rol TRABAJADOR, así que no se le da visibilidad total: evita que
-- cualquier cuenta pueda extraer RUT/correo/cargo de toda la empresa vía la API directa.
drop policy if exists "trabajadores_select" on public.trabajadores;
create policy "trabajadores_select" on public.trabajadores for select to authenticated
  using (
    auth_user_id = auth.uid()
    or public.tiene_rol('SUPER_ADMIN')
    or public.tiene_rol('ADMINISTRADOR')
    or public.tiene_rol('LECTOR')
  );

drop policy if exists "trabajadores_insert" on public.trabajadores;
create policy "trabajadores_insert" on public.trabajadores for insert to authenticated
  with check (public.tiene_rol('SUPER_ADMIN'));

-- Solo SUPER_ADMIN puede editar trabajadores. La app no ofrece auto-edición de perfil (el
-- menú "Mi perfil" todavía no está implementado) — permitir auth_user_id = auth.uid() aquí
-- dejaba que cualquier cuenta autenticada modificara su propio rut/cargo/area/activo/correo
-- llamando directo a la API de Supabase, sin pasar por la UI de Administración.
drop policy if exists "trabajadores_update" on public.trabajadores;
create policy "trabajadores_update" on public.trabajadores for update to authenticated
  using (public.tiene_rol('SUPER_ADMIN'))
  with check (public.tiene_rol('SUPER_ADMIN'));

-- --- trabajador_roles ---
alter table public.trabajador_roles enable row level security;

drop policy if exists "trabajador_roles_select" on public.trabajador_roles;
create policy "trabajador_roles_select" on public.trabajador_roles for select to authenticated
  using (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "trabajador_roles_write" on public.trabajador_roles;
create policy "trabajador_roles_write" on public.trabajador_roles for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

-- --- asignaciones_proyecto ---
alter table public.asignaciones_proyecto enable row level security;

drop policy if exists "asignaciones_select" on public.asignaciones_proyecto;
create policy "asignaciones_select" on public.asignaciones_proyecto for select to authenticated
  using (
    administrador_id = public.trabajador_actual_id()
    or trabajador_id = public.trabajador_actual_id()
    or public.tiene_rol('SUPER_ADMIN')
  );

drop policy if exists "asignaciones_write" on public.asignaciones_proyecto;
create policy "asignaciones_write" on public.asignaciones_proyecto for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

-- --- lector_alcances ---
alter table public.lector_alcances enable row level security;

drop policy if exists "lector_alcances_select" on public.lector_alcances;
create policy "lector_alcances_select" on public.lector_alcances for select to authenticated
  using (lector_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "lector_alcances_write" on public.lector_alcances;
create policy "lector_alcances_write" on public.lector_alcances for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

-- --- trabajador_jornadas ---
alter table public.trabajador_jornadas enable row level security;

drop policy if exists "trabajador_jornadas_select" on public.trabajador_jornadas;
create policy "trabajador_jornadas_select" on public.trabajador_jornadas for select to authenticated
  using (
    trabajador_id = public.trabajador_actual_id()
    or public.tiene_rol('SUPER_ADMIN')
    or public.tiene_rol('ADMINISTRADOR')
  );

drop policy if exists "trabajador_jornadas_write" on public.trabajador_jornadas;
create policy "trabajador_jornadas_write" on public.trabajador_jornadas for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

-- --- trabajador_proyectos_periodo ---
alter table public.trabajador_proyectos_periodo enable row level security;

drop policy if exists "tpp_select" on public.trabajador_proyectos_periodo;
create policy "tpp_select" on public.trabajador_proyectos_periodo for select to authenticated
  using (
    trabajador_id = public.trabajador_actual_id()
    or public.tiene_rol('SUPER_ADMIN')
    or public.administra_proyecto(proyecto_id)
  );

drop policy if exists "tpp_insert" on public.trabajador_proyectos_periodo;
create policy "tpp_insert" on public.trabajador_proyectos_periodo for insert to authenticated
  with check (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "tpp_update" on public.trabajador_proyectos_periodo;
create policy "tpp_update" on public.trabajador_proyectos_periodo for update to authenticated
  using (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'))
  with check (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "tpp_delete" on public.trabajador_proyectos_periodo;
create policy "tpp_delete" on public.trabajador_proyectos_periodo for delete to authenticated
  using (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

-- --- planillas_semanales ---
alter table public.planillas_semanales enable row level security;

drop policy if exists "planillas_select" on public.planillas_semanales;
create policy "planillas_select" on public.planillas_semanales for select to authenticated
  using (
    trabajador_id = public.trabajador_actual_id()
    or public.tiene_rol('SUPER_ADMIN')
    or public.puede_ver_planilla(id)
    or public.lector_puede_ver_planilla(id)
  );

drop policy if exists "planillas_insert" on public.planillas_semanales;
create policy "planillas_insert" on public.planillas_semanales for insert to authenticated
  with check (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

-- El trabajador dueño solo puede editar su planilla mientras esté BORRADOR/DEVUELTA (p.ej.
-- para enviarla). El administrador que gestiona el proyecto solo puede transicionarla
-- mientras esté ENVIADA (aprobar/devolver). SUPER_ADMIN no tiene esta restricción.
drop policy if exists "planillas_update" on public.planillas_semanales;
create policy "planillas_update" on public.planillas_semanales for update to authenticated
  using (
    public.trabajador_puede_editar_planilla(id)
    or public.tiene_rol('SUPER_ADMIN')
    or public.administrador_puede_transicionar_planilla(id)
  )
  with check (
    public.trabajador_puede_editar_planilla(id)
    or public.tiene_rol('SUPER_ADMIN')
    or public.administrador_puede_transicionar_planilla(id)
  );

-- --- registros_horas ---
alter table public.registros_horas enable row level security;

drop policy if exists "registros_select" on public.registros_horas;
create policy "registros_select" on public.registros_horas for select to authenticated
  using (
    trabajador_id = public.trabajador_actual_id()
    or public.tiene_rol('SUPER_ADMIN')
    or public.puede_ver_planilla(planilla_semanal_id)
    or public.lector_puede_ver_planilla(planilla_semanal_id)
  );

-- Solo se puede insertar/editar/borrar mientras la planilla dueña esté BORRADOR/DEVUELTA
-- (ver trabajador_puede_editar_planilla). SUPER_ADMIN no tiene esta restricción.
drop policy if exists "registros_insert" on public.registros_horas;
create policy "registros_insert" on public.registros_horas for insert to authenticated
  with check (
    (trabajador_id = public.trabajador_actual_id() and public.trabajador_puede_editar_planilla(planilla_semanal_id))
    or public.tiene_rol('SUPER_ADMIN')
  );

drop policy if exists "registros_update" on public.registros_horas;
create policy "registros_update" on public.registros_horas for update to authenticated
  using (
    (trabajador_id = public.trabajador_actual_id() and public.trabajador_puede_editar_planilla(planilla_semanal_id))
    or public.tiene_rol('SUPER_ADMIN')
  )
  with check (
    (trabajador_id = public.trabajador_actual_id() and public.trabajador_puede_editar_planilla(planilla_semanal_id))
    or public.tiene_rol('SUPER_ADMIN')
  );

drop policy if exists "registros_delete" on public.registros_horas;
create policy "registros_delete" on public.registros_horas for delete to authenticated
  using (
    (trabajador_id = public.trabajador_actual_id() and public.trabajador_puede_editar_planilla(planilla_semanal_id))
    or public.tiene_rol('SUPER_ADMIN')
  );

-- --- detalle_horas_extra ---
alter table public.detalle_horas_extra enable row level security;

drop policy if exists "detalle_hex_select" on public.detalle_horas_extra;
create policy "detalle_hex_select" on public.detalle_horas_extra for select to authenticated
  using (
    exists (
      select 1 from public.registros_horas rh
      where rh.id = detalle_horas_extra.registro_hora_id
        and (
          rh.trabajador_id = public.trabajador_actual_id()
          or public.tiene_rol('SUPER_ADMIN')
          or public.puede_ver_planilla(rh.planilla_semanal_id)
        )
    )
  );

drop policy if exists "detalle_hex_write" on public.detalle_horas_extra;
create policy "detalle_hex_write" on public.detalle_horas_extra for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN') or public.tiene_rol('ADMINISTRADOR'))
  with check (public.tiene_rol('SUPER_ADMIN') or public.tiene_rol('ADMINISTRADOR'));

-- --- aprobaciones_planilla ---
alter table public.aprobaciones_planilla enable row level security;

drop policy if exists "aprobaciones_select" on public.aprobaciones_planilla;
create policy "aprobaciones_select" on public.aprobaciones_planilla for select to authenticated
  using (public.puede_ver_planilla(planilla_semanal_id) or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "aprobaciones_insert" on public.aprobaciones_planilla;
create policy "aprobaciones_insert" on public.aprobaciones_planilla for insert to authenticated
  with check (
    administrador_id = public.trabajador_actual_id()
    and (public.tiene_rol('ADMINISTRADOR') or public.tiene_rol('SUPER_ADMIN'))
    and public.puede_ver_planilla(planilla_semanal_id)
  );

-- --- auditoria ---
alter table public.auditoria enable row level security;

-- Sin política de insert para "authenticated": las filas de auditoria las crea solo el
-- trigger registrar_auditoria() (ver más arriba), nunca el cliente directamente.
drop policy if exists "auditoria_insert" on public.auditoria;

drop policy if exists "auditoria_select" on public.auditoria;
create policy "auditoria_select" on public.auditoria for select to authenticated
  using (public.tiene_rol('SUPER_ADMIN'));

-- --- configuracion_sistema ---
alter table public.configuracion_sistema enable row level security;

drop policy if exists "config_select" on public.configuracion_sistema;
create policy "config_select" on public.configuracion_sistema for select to authenticated
  using (public.tiene_rol('ADMINISTRADOR') or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "config_write" on public.configuracion_sistema;
create policy "config_write" on public.configuracion_sistema for all to authenticated
  using (public.tiene_rol('SUPER_ADMIN')) with check (public.tiene_rol('SUPER_ADMIN'));

-- =============================================================================
-- Datos semilla
-- =============================================================================
insert into public.roles (codigo, nombre, descripcion) values
  ('TRABAJADOR', 'Trabajador', 'Registra sus propias horas semanales.'),
  ('ADMINISTRADOR', 'Administrador', 'Aprueba planillas de los proyectos que administra.'),
  ('LECTOR', 'Lector', 'Acceso de solo lectura a reportes según su alcance asignado.'),
  ('SUPER_ADMIN', 'Super administrador', 'Acceso total, gestiona catálogos y roles.')
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

insert into public.tipos_registro
  (codigo, nombre, categoria, requiere_proyecto, completa_jornada, es_hora_extra, orden_visual) values
  ('ORD', 'Horas ordinarias', 'TRABAJO', true, true, false, 1),
  -- HEX simplificado sin proyecto obligatorio: una sola columna semanal de horas extra
  -- en la tabla del trabajador (el detalle por proyecto queda para una futura iteración).
  ('HEX', 'Horas extraordinarias', 'TRABAJO', false, false, true, 2),
  ('CAP', 'Capacitación', 'TRABAJO', false, true, false, 3),
  ('VAC', 'Vacaciones', 'AUSENCIA', false, true, false, 4),
  ('LIC', 'Licencia médica', 'AUSENCIA', false, true, false, 5),
  ('PER', 'Permiso', 'AUSENCIA', false, false, false, 6),
  ('AUS', 'Ausencia', 'AUSENCIA', false, true, false, 7)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  categoria = excluded.categoria,
  requiere_proyecto = excluded.requiere_proyecto,
  completa_jornada = excluded.completa_jornada,
  es_hora_extra = excluded.es_hora_extra,
  orden_visual = excluded.orden_visual;

insert into public.jornadas (codigo, nombre, horas_semanales) values
  ('ESTANDAR', 'Jornada estándar', 40.0)
on conflict (codigo) do update set nombre = excluded.nombre, horas_semanales = excluded.horas_semanales;

insert into public.jornada_dias (jornada_id, dia_semana, horas_esperadas)
select j.id, dia, horas
from public.jornadas j
cross join (values
  (1, 8.5), (2, 8.5), (3, 8.5), (4, 8.5), (5, 6.0), (6, 0.0), (7, 0.0)
) as d(dia, horas)
where j.codigo = 'ESTANDAR'
on conflict (jornada_id, dia_semana) do update set horas_esperadas = excluded.horas_esperadas;

-- Feriados oficiales de Chile 2026 (solo los de fecha fija; Viernes Santo y Sábado Santo
-- cambian cada año según la Pascua y se pueden agregar a mano desde Configuración > Feriados).
insert into public.feriados (fecha, nombre, tipo) values
  ('2026-01-01', 'Año Nuevo', 'FIJO'),
  ('2026-05-01', 'Día Nacional del Trabajo', 'FIJO'),
  ('2026-05-21', 'Día de las Glorias Navales', 'FIJO'),
  ('2026-06-29', 'San Pedro y San Pablo', 'FIJO'),
  ('2026-07-16', 'Virgen del Carmen', 'FIJO'),
  ('2026-08-15', 'Asunción de la Virgen', 'FIJO'),
  ('2026-09-18', 'Independencia Nacional', 'FIJO'),
  ('2026-09-19', 'Glorias del Ejército', 'FIJO'),
  ('2026-10-12', 'Encuentro de Dos Mundos', 'FIJO'),
  ('2026-10-31', 'Día de las Iglesias Evangélicas y Protestantes', 'FIJO'),
  ('2026-11-01', 'Día de Todos los Santos', 'FIJO'),
  ('2026-12-08', 'Inmaculada Concepción', 'FIJO'),
  ('2026-12-25', 'Navidad', 'FIJO')
on conflict (fecha) do update set nombre = excluded.nombre, tipo = excluded.tipo, activo = true;

-- Se desactivan los centros de costo de ejemplo de la v1 que no son reales (no aparecen en el
-- catálogo real de la empresa), sin borrarlos por si ya hay registros_horas que los referencian.
update public.proyectos set activo = false
where codigo in ('60-002', '30-101', '40-220', '50-033');

-- El código 99-999 fue solo una prueba manual: se borra si no tiene horas/asignaciones
-- registradas; si ya tiene datos asociados, se deja desactivado como respaldo.
delete from public.proyectos p
where p.codigo = '99-999'
  and not exists (select 1 from public.registros_horas r where r.proyecto_id = p.id)
  and not exists (select 1 from public.trabajador_proyectos_periodo t where t.proyecto_id = p.id);
update public.proyectos set activo = false where codigo = '99-999';

-- Catálogo real de centros de costo activos, tomado de Info/HH 07 2026 Ctrl Diario PCC.xlsx
-- (hoja "Resumen"). Los 5 primeros son los fijos que siempre aparecen para todos los
-- trabajadores (ver FIXED_COST_CENTER_CODES en app/src/features/hours/domain.ts); el resto
-- queda disponible para seleccionar por período desde el botón "Centros de costo".
insert into public.proyectos (codigo, nombre) values
  ('20-004', 'Reunión Operaciones'),
  ('20-009', 'Capacitaciones Técnicas sin CC asignado'),
  ('20-013', 'Visitas a Terreno (Gestión Operacional)'),
  ('20-015', 'Capacitaciones Seguridad'),
  ('20-020', 'Gestión de ofertas Técnicas'),
  ('20-011', 'Gestión área eficiencia Energética'),
  ('20-012', 'Soporte Técnico AMDT'),
  ('20-016', 'Capacitación técnica con CC asignado'),
  ('20-017', 'Estudio de nuevas tecnologias/Innovación'),
  ('20-019', 'Gestion comercial CIK'),
  ('20-021', 'Gestión Gerente Operaciones'),
  ('20-100', 'Centro integración Krontec'),
  ('41-341', 'Mig. PLC CCCH'),
  ('41-343', 'Proyecto PME DSAL'),
  ('41-364', 'PTA DEM. DE LIXIVIACIÓN– DRT'),
  ('41-382', 'Servicio Octoplant Codelco Corporativo'),
  ('41-386', 'Gabinetes para Coasin'),
  ('41-394', 'Proyecto Codelco TOVE IV'),
  ('41-398', 'Chuqui Precisión IX Etapa Tranque Talabre'),
  ('41-402', 'Enap, sala eléctrica Hualpen'),
  ('41-417', 'Sistema de gestión hospitales, Dartel'),
  ('41-419', 'Implementación Octoplant para Aceros, Descom'),
  ('41-420', 'Servicios programación PLC SQM'),
  ('41-425', 'Servicios Aceros Arequipa Octopant'),
  ('41-428', 'Capacitación Puerto barquitos'),
  ('41-429', 'Contrato de Apoyo QA a MEL'),
  ('41-434', 'SQM Industrial - Vicepresidencia Operaciones Nitratos y Yodo, Faena Coya Sur'),
  ('41-437', 'Upgrade sistema de gestión de energía Ion Enterprise e implementación PME 2023'),
  ('41-441', 'Upgrade PME de MEL'),
  ('41-445', 'Cto Mantención DRT'),
  ('41-450', 'Mantenimiento y Asistencia PCS Planta Concentradora Mantoverde'),
  ('41-451', 'Servicio de levantamiento Sonacol'),
  ('41-452', 'Recomisionamiento Lógica Bomba GEHO 286 y Gateway'),
  ('41-455', 'Asesoría y servicio e implementación de Ciberseguridad OYV'),
  ('41-456', 'Contrato marco de tecnología y automatización'),
  ('41-457', 'Migración CITEC Meridian'),
  ('41-458', 'Cambio IP PMER Candelaria'),
  ('42-001', 'Modelos Tarifas'),
  ('42-003', 'Estudios de I+D'),
  ('42-004', 'Apoyo Gerencia Innovación'),
  ('42-005', 'Sist. análisis trafos'),
  ('43-029', 'Administración contrato Marco'),
  ('43-052', 'DPS Tech Components SCPY'),
  ('43-058', 'EXE Retrofit PCS7 Molinos Concentradora Spence'),
  ('43-062', 'EXE Upgrade PLC OLAP Apilamiento'),
  ('43-063', 'EXE Migración PLC Bomba Geho 285 CHO'),
  ('43-070', 'SPS/DPS Upgrade PLC MDC-RO-Filters Courier AH1'),
  ('43-071', 'SPS/DPS Upgrade PLC OLAP - Ripios'),
  ('43-073', 'Cerro Colorado Life Extension CCLE'),
  ('43-074', 'IPS Upgrade DCS Laguna Seca L2'),
  ('43-075', 'CS-Bailey DCS Migration Dry Area'),
  ('43-076', 'Apoyo EXE SCPY Spence'),
  ('46-001', 'CIK - Procesos Ambientales - BHP Spence'),
  ('46-002', 'Suministro Sistema de Control y Comunicaciones MVO-031'),
  ('46-003', 'Suministro gabinete Thechint sistema Voip (telefonía)'),
  ('46-004', 'Capstone Copper'),
  ('46-005', 'Suministro gabinete 2000-EXP-01 Minera Carola'),
  ('10-001', 'Otros Gerencia General'),
  ('10-003', 'Otros Contabilidad'),
  ('10-010', 'Otros TI'),
  ('20-014', 'Gestión Comercial MDT'),
  ('41-418', 'Validación Buses de Campo Laguna Seca L2'),
  ('41-423', 'Servicio Verificación integridad Buses de Campo FF Flotación Rougher'),
  ('41-427', 'Configuración de programa bomba Geho en BMI'),
  ('41-430', 'Capacitación y soporte AXS4 ICCP'),
  ('41-433', 'Implementación Servidor Octoplant CCU - 3 Plantas'),
  ('41-436', 'Migración Red Profibus a Profinet MolyB'),
  ('41-438', 'Servicio de actualización y mantenimiento servidores Octoplant'),
  ('41-446', 'Asistencia especialista PME Clínica Alemana'),
  ('41-447', 'Recuperación PME Elecmetal'),
  ('41-449', 'Migración ICCP Arauco'),
  ('43-077', 'Centro de costo 43-077'),
  ('30-002', 'Gastos Comerciales'),
  ('30-005', 'Gestión comercial Zona Norte'),
  ('30-007', 'Gestión comercial Zona Sur'),
  ('30-010', 'Oficina Jardines'),
  ('30-011', 'Viajes Internacionales'),
  -- Códigos detectados en el histórico de horas de julio 2026 (Info/HH ...) que no
  -- aparecían en el catálogo "Hoja1" del Excel.
  ('10-009', 'Comité Paritario'),
  ('10-012', 'Oficinas Jardines'),
  ('41-448', 'Servicios en terreno MVO'),
  ('12-002', 'Centro de costo 12-002'),
  ('43-072', 'Centro de costo 43-072'),
  ('61-595', 'Centro de costo 61-595'),
  ('61-596', 'Centro de costo 61-596'),
  ('61-600', 'Centro de costo 61-600')
on conflict (codigo) do update set nombre = excluded.nombre, activo = true;

-- Categoría "Cliente/Área" por centro de costo, para el dashboard de HH. Se agrega como
-- columna editable desde Configuración (no un catálogo aparte) para mantenerlo simple.
-- El mapeo replica exactamente el agrupamiento manual que usa Info/HH 07 2026 Ctrl Diario
-- PCC.xlsx (hoja Resumen, fórmulas SUMIF de la sección "Cliente"). Los códigos que esa hoja
-- nunca agrupó (ni los que agregamos después al catálogo) quedan con cliente_area = null,
-- mostrados en el dashboard como "Sin categoría" — no se fuerza un valor inventado.
alter table public.proyectos add column if not exists cliente_area varchar(150);

update public.proyectos set cliente_area = 'Codelco DRT' where codigo in ('41-445');
update public.proyectos set cliente_area = 'Codelco, Contrato Marco' where codigo in ('41-456');
update public.proyectos set cliente_area = 'BHP Technology' where codigo in (
  '43-029', '43-052', '43-058', '43-062', '43-063', '43-070', '43-071', '43-073', '43-074', '43-075', '43-076'
);
update public.proyectos set cliente_area = 'BHP MEL y Spence' where codigo in ('41-429', '41-452');
update public.proyectos set cliente_area = 'Mantoverde' where codigo in ('41-450');
update public.proyectos set cliente_area = 'CDRT Pta demostrativa' where codigo in ('41-364');
update public.proyectos set cliente_area = 'Coasin' where codigo in ('41-386');
update public.proyectos set cliente_area = 'Proyecto Talabre' where codigo in ('41-398');
update public.proyectos set cliente_area = 'Proyecto Tove 4' where codigo in ('41-394');
update public.proyectos set cliente_area = 'Proyecto Enap Hualpen' where codigo in ('41-402');
update public.proyectos set cliente_area = 'Gestión de Energía' where codigo in (
  '20-011', '41-343', '41-417', '41-437', '41-441', '42-001', '42-004', '41-458'
);
update public.proyectos set cliente_area = 'CIK' where codigo in ('20-019', '46-001', '46-002', '46-004', '46-005');
update public.proyectos set cliente_area = 'Operaciones' where codigo in ('20-004', '20-013', '20-021');
update public.proyectos set cliente_area = 'Capacitaciones' where codigo in ('20-009', '20-015', '20-016', '20-017');
update public.proyectos set cliente_area = 'SQM' where codigo in ('41-420', '41-434');
update public.proyectos set cliente_area = 'Apoyo otras gerencias' where codigo in (
  '20-020', '10-001', '10-003', '30-005', '30-007', '30-010', '30-011'
);
update public.proyectos set cliente_area = 'AMDT' where codigo in ('20-012', '41-382', '41-419', '41-425');
update public.proyectos set cliente_area = 'IT' where codigo in ('10-010', '41-455');
update public.proyectos set cliente_area = 'Sonacol' where codigo in ('41-451');

-- Limpieza puntual: se quitan del selector los períodos ya generados de meses que dejaron de
-- interesar (mayo/junio/julio 2026), siempre que no tengan una planilla cargada (si alguien ya
-- registró horas ahí, se conserva para no perder datos).
delete from public.periodos p
where p.creado_automaticamente = true
  and p.nombre in ('Mayo 2026', 'Junio 2026', 'Julio 2026')
  and not exists (select 1 from public.planillas_semanales ps where ps.periodo_id = p.id);

-- Períodos con ciclo fijo "25 al 24" desde el mes actual hasta 4 meses adelante (sin meses
-- pasados), cada uno con sus semanas completas (lunes a domingo) ya generadas.
select public.generar_periodo_ciclo_25_24((current_date + (n || ' months')::interval)::date)
from generate_series(0, 4) as n;

-- =============================================================================
-- Backfill: usuarios de Supabase Auth creados antes de este esquema (con el
-- trigger viejo, o manualmente) que todavía no tienen fila en trabajadores.
-- Re-ejecutar este script es seguro: a los nuevos usuarios los cubre el trigger
-- on_auth_user_created; esto solo completa a los que quedaron sin trabajador.
-- =============================================================================
insert into public.trabajadores (auth_user_id, correo_corporativo)
select u.id, u.email
from auth.users u
left join public.trabajadores t on t.auth_user_id = u.id
where t.id is null
on conflict (correo_corporativo) do nothing;

insert into public.trabajador_roles (trabajador_id, rol_id, activo)
select t.id, r.id, true
from public.trabajadores t
join public.roles r on r.codigo = 'TRABAJADOR'
left join public.trabajador_roles tr on tr.trabajador_id = t.id and tr.rol_id = r.id
where tr.id is null;
