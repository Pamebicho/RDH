-- =============================================================================
-- Registro de Horas Krontec — esquema Supabase (Postgres)
-- Ejecutar completo en el SQL editor del proyecto Supabase (una sola vez).
-- Es idempotente: se puede volver a correr sin duplicar datos ni políticas.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Función utilitaria: mantener updated_at al día
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — datos de perfil ligados 1:1 a auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  area text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Crea automáticamente el perfil cuando alguien se registra en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- cost_centers — catálogo global de centros de costo
-- ---------------------------------------------------------------------------
create table if not exists public.cost_centers (
  id text primary key,
  name text not null,
  is_active boolean not null default true
);

alter table public.cost_centers enable row level security;

drop policy if exists "cost_centers_select_authenticated" on public.cost_centers;
create policy "cost_centers_select_authenticated" on public.cost_centers
  for select to authenticated using (true);

insert into public.cost_centers (id, name, is_active) values
  ('20-013', 'Gestión Operaciones', true),
  ('10-010', 'Otros TI', true),
  ('41-394', 'Proyecto TOVE IV', true),
  ('41-451', 'Servicio Sonacol', true),
  ('60-002', 'Capacitación', true),
  ('30-101', 'Administración', true),
  ('40-220', 'Proyecto Minería Norte', true),
  ('50-033', 'Soporte interno', true)
on conflict (id) do update set name = excluded.name, is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- period_definitions — catálogo de períodos disponibles (mes, horas esperadas, plazo)
-- ---------------------------------------------------------------------------
create table if not exists public.period_definitions (
  period text primary key, -- formato 'YYYY-MM'
  label text not null,
  expected_hours numeric(6, 2) not null,
  deadline date not null
);

alter table public.period_definitions enable row level security;

drop policy if exists "period_definitions_select_authenticated" on public.period_definitions;
create policy "period_definitions_select_authenticated" on public.period_definitions
  for select to authenticated using (true);

insert into public.period_definitions (period, label, expected_hours, deadline) values
  ('2026-07', 'Julio 2026', 157.5, '2026-08-03'),
  ('2026-06', 'Junio 2026', 170, '2026-07-03'),
  ('2026-05', 'Mayo 2026', 178.5, '2026-06-03')
on conflict (period) do update set
  label = excluded.label,
  expected_hours = excluded.expected_hours,
  deadline = excluded.deadline;

-- ---------------------------------------------------------------------------
-- periods — registro mensual de un usuario para un período
-- ---------------------------------------------------------------------------
create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null references public.period_definitions (period),
  status text not null default 'editing' check (status in ('editing', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

alter table public.periods enable row level security;

drop trigger if exists periods_set_updated_at on public.periods;
create trigger periods_set_updated_at
  before update on public.periods
  for each row execute procedure public.set_updated_at();

drop policy if exists "periods_all_own" on public.periods;
create policy "periods_all_own" on public.periods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- period_cost_centers — centros de costo seleccionados para un período
-- ---------------------------------------------------------------------------
create table if not exists public.period_cost_centers (
  period_id uuid not null references public.periods (id) on delete cascade,
  cost_center_id text not null references public.cost_centers (id),
  primary key (period_id, cost_center_id)
);

alter table public.period_cost_centers enable row level security;

drop policy if exists "period_cost_centers_all_own" on public.period_cost_centers;
create policy "period_cost_centers_all_own" on public.period_cost_centers
  for all using (
    exists (
      select 1 from public.periods p
      where p.id = period_cost_centers.period_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.periods p
      where p.id = period_cost_centers.period_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- time_entries — horas cargadas por día y centro de costo
-- ---------------------------------------------------------------------------
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods (id) on delete cascade,
  entry_date date not null,
  cost_center_id text not null references public.cost_centers (id),
  hours numeric(4, 2) not null default 0 check (hours >= 0),
  updated_at timestamptz not null default now(),
  unique (period_id, entry_date, cost_center_id)
);

alter table public.time_entries enable row level security;

drop trigger if exists time_entries_set_updated_at on public.time_entries;
create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute procedure public.set_updated_at();

drop policy if exists "time_entries_all_own" on public.time_entries;
create policy "time_entries_all_own" on public.time_entries
  for all using (
    exists (
      select 1 from public.periods p
      where p.id = time_entries.period_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.periods p
      where p.id = time_entries.period_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- daily_notes — observación opcional por día
-- ---------------------------------------------------------------------------
create table if not exists public.daily_notes (
  period_id uuid not null references public.periods (id) on delete cascade,
  entry_date date not null,
  observation text not null default '',
  primary key (period_id, entry_date)
);

alter table public.daily_notes enable row level security;

drop policy if exists "daily_notes_all_own" on public.daily_notes;
create policy "daily_notes_all_own" on public.daily_notes
  for all using (
    exists (
      select 1 from public.periods p
      where p.id = daily_notes.period_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.periods p
      where p.id = daily_notes.period_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Índices de apoyo
-- ---------------------------------------------------------------------------
create index if not exists idx_periods_user on public.periods (user_id);
create index if not exists idx_time_entries_period on public.time_entries (period_id);
create index if not exists idx_daily_notes_period on public.daily_notes (period_id);
