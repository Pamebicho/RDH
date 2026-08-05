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
  jefe_contrato_id uuid references public.trabajadores (id),
  fecha_ingreso date,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

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

-- Genera las semanas (lunes a domingo) que cubren un período; se puede volver a
-- llamar para regenerar (borra y vuelve a crear las semanas de ese período).
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

  delete from public.semanas where periodo_id = p_periodo_id;

  v_cursor_lunes := v_inicio - ((extract(isodow from v_inicio)::int - 1));

  while v_cursor_lunes <= v_fin loop
    insert into public.semanas (periodo_id, numero_semana, fecha_inicio, fecha_fin)
    values (p_periodo_id, v_numero, v_cursor_lunes, v_cursor_lunes + 6);
    v_cursor_lunes := v_cursor_lunes + 7;
    v_numero := v_numero + 1;
  end loop;
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

-- =============================================================================
-- Trigger: crear trabajador + rol TRABAJADOR al registrarse en Supabase Auth
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_trabajador_id uuid;
  v_rol_trabajador_id uuid;
begin
  insert into public.trabajadores (auth_user_id, correo_corporativo)
  values (new.id, new.email)
  returning id into v_trabajador_id;

  select id into v_rol_trabajador_id from public.roles where codigo = 'TRABAJADOR';

  if v_rol_trabajador_id is not null then
    insert into public.trabajador_roles (trabajador_id, rol_id, activo)
    values (v_trabajador_id, v_rol_trabajador_id, true);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

drop policy if exists "trabajadores_select" on public.trabajadores;
create policy "trabajadores_select" on public.trabajadores for select to authenticated using (true);

drop policy if exists "trabajadores_insert" on public.trabajadores;
create policy "trabajadores_insert" on public.trabajadores for insert to authenticated
  with check (public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "trabajadores_update" on public.trabajadores;
create policy "trabajadores_update" on public.trabajadores for update to authenticated
  using (auth_user_id = auth.uid() or public.tiene_rol('SUPER_ADMIN'))
  with check (auth_user_id = auth.uid() or public.tiene_rol('SUPER_ADMIN'));

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

drop policy if exists "planillas_update" on public.planillas_semanales;
create policy "planillas_update" on public.planillas_semanales for update to authenticated
  using (
    trabajador_id = public.trabajador_actual_id()
    or public.tiene_rol('SUPER_ADMIN')
    or public.puede_ver_planilla(id)
  )
  with check (
    trabajador_id = public.trabajador_actual_id()
    or public.tiene_rol('SUPER_ADMIN')
    or public.puede_ver_planilla(id)
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

drop policy if exists "registros_insert" on public.registros_horas;
create policy "registros_insert" on public.registros_horas for insert to authenticated
  with check (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "registros_update" on public.registros_horas;
create policy "registros_update" on public.registros_horas for update to authenticated
  using (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'))
  with check (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

drop policy if exists "registros_delete" on public.registros_horas;
create policy "registros_delete" on public.registros_horas for delete to authenticated
  using (trabajador_id = public.trabajador_actual_id() or public.tiene_rol('SUPER_ADMIN'));

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

drop policy if exists "auditoria_insert" on public.auditoria;
create policy "auditoria_insert" on public.auditoria for insert to authenticated
  with check (usuario_id = public.trabajador_actual_id() or usuario_id is null);

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

-- Centros de costo fijos: los mismos para todos los trabajadores, en todos los períodos
-- (no hay selección por trabajador/período). Se desactivan los de ejemplo de la v1 que ya
-- no aplican, sin borrarlos (por si ya hay registros_horas/asignaciones que los referencian).
update public.proyectos set activo = false
where codigo in ('10-010', '41-394', '41-451', '60-002', '30-101', '40-220', '50-033');

insert into public.proyectos (codigo, nombre) values
  ('20-004', 'Reuniones de Operaciones'),
  ('20-009', 'Capacitaciones Técnicas'),
  ('20-013', 'Gest. Operaciones'),
  ('20-015', 'Capacitaciones Seguridad'),
  ('20-020', 'Gest. Ofertas Técnicas')
on conflict (codigo) do update set nombre = excluded.nombre, activo = true;

-- Período de ejemplo (ciclo 25 a 24) y sus semanas, para poder probar el flujo completo.
insert into public.periodos (nombre, fecha_inicio, fecha_fin, estado, fecha_limite_administrador, creado_automaticamente)
values ('Agosto 2026', '2026-07-25', '2026-08-24', 'ABIERTO', '2026-08-27', true)
on conflict (nombre) do update set
  fecha_inicio = excluded.fecha_inicio,
  fecha_fin = excluded.fecha_fin,
  estado = excluded.estado,
  fecha_limite_administrador = excluded.fecha_limite_administrador;

select public.generar_semanas_periodo(id) from public.periodos where nombre = 'Agosto 2026';

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
