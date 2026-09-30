-- Borra por completo los períodos "Mayo 2026" y "Agosto 2026": planillas semanales, registros
-- de horas día a día, detalle de horas extra e historial de aprobaciones de esos meses.
-- IRREVERSIBLE. planillas_semanales no cascadea automáticamente desde periodos/semanas, así que
-- se borra explícitamente primero (eso sí cascadea a registros_horas, detalle_horas_extra y
-- aprobaciones_planilla). lector_alcances tampoco cascadea desde periodos, se limpia aparte para
-- no bloquear el borrado si algún Lector tenía alcance asignado a esos períodos.
begin;

delete from public.lector_alcances
where periodo_id in (select id from public.periodos where nombre in ('Mayo 2026', 'Agosto 2026'));

delete from public.planillas_semanales
where periodo_id in (select id from public.periodos where nombre in ('Mayo 2026', 'Agosto 2026'));

delete from public.periodos
where nombre in ('Mayo 2026', 'Agosto 2026');

commit;
