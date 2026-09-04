-- =============================================================================
-- Verificación estructural de los cambios de seguridad (correr después del
-- schema.sql completo). Solo lee metadata, no modifica nada.
-- =============================================================================

-- 1. Las funciones nuevas deben existir
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'trabajador_puede_editar_planilla',
    'administrador_puede_transicionar_planilla',
    'registrar_auditoria'
  )
order by proname;
-- Esperado: las 3 filas.

-- 2. Los triggers de auditoría deben existir en las 3 tablas
select event_object_table, trigger_name
from information_schema.triggers
where trigger_name in ('trabajadores_auditoria', 'planillas_auditoria', 'registros_auditoria')
order by event_object_table;
-- Esperado: 3 filas (trabajadores, planillas_semanales, registros_horas).

-- 3. trabajadores_update ya no debe permitir auth_user_id = auth.uid()
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'public.trabajadores'::regclass
  and polname = 'trabajadores_update';
-- Esperado: using_expr = tiene_rol('SUPER_ADMIN'::text) — sin mención a auth_user_id.

-- 4. trabajadores_select ya no debe ser "true" sin condiciones
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'public.trabajadores'::regclass
  and polname = 'trabajadores_select';
-- Esperado: using_expr menciona auth_user_id = auth.uid() y tiene_rol(...).

-- 5. registros_horas y planillas_semanales deben usar las nuevas funciones
select polrelid::regclass as tabla, polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid in ('public.registros_horas'::regclass, 'public.planillas_semanales'::regclass)
  and polcmd in ('w', '*') -- update
order by tabla, polname;
-- Esperado: las expresiones mencionan trabajador_puede_editar_planilla /
-- administrador_puede_transicionar_planilla.

-- 6. auditoria ya no debe tener política de insert para "authenticated"
select polname
from pg_policy
where polrelid = 'public.auditoria'::regclass;
-- Esperado: solo "auditoria_select" (ninguna de insert).
