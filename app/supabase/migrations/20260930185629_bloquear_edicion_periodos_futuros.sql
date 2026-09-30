-- Refuerza a nivel de base de datos que un trabajador no pueda cargar ni enviar horas en un
-- período que todavía no comienza (cada período nace el día 25), ni siquiera llamando directo a
-- la API de Supabase sin pasar por la app. Complementa la restricción ya agregada en el frontend
-- (HoursRegisterPage ya no lo deja elegir un período futuro en el selector).
--
-- trabajador_puede_editar_planilla ya la usan las políticas de planillas_update, registros_insert,
-- registros_update y registros_delete: agregarle la validación de fecha aquí las endurece a las
-- cuatro de una sola vez. SUPER_ADMIN mantiene su excepción habitual en todas las políticas.
create or replace function public.trabajador_puede_editar_planilla(p_planilla_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.planillas_semanales p
    join public.periodos per on per.id = p.periodo_id
    where p.id = p_planilla_id
      and p.trabajador_id = public.trabajador_actual_id()
      and p.estado in ('BORRADOR', 'DEVUELTA')
      and per.fecha_inicio <= current_date
  );
$$;

-- Tampoco se puede crear la planilla (el "borrador" vacío) de un período que todavía no
-- comienza. Sin esto, aunque no se pudieran cargar horas, igual se podría crear la fila vacía
-- llamando directo a la API.
drop policy if exists "planillas_insert" on public.planillas_semanales;
create policy "planillas_insert" on public.planillas_semanales for insert to authenticated
  with check (
    (
      trabajador_id = public.trabajador_actual_id()
      and exists (
        select 1 from public.periodos per
        where per.id = periodo_id and per.fecha_inicio <= current_date
      )
    )
    or public.tiene_rol('SUPER_ADMIN')
  );
