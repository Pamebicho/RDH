-- Renombra los 5 centros de costo fijos (FIXED_COST_CENTER_CODES en
-- app/src/features/hours/domain.ts) que aparecen siempre para todos los trabajadores.
-- Nota: en "Gestión Oerta Técnica" se corrigió el error de tipeo a "Gestión Oferta Técnica".
update public.proyectos set nombre = 'Reunión de Operaciones' where codigo = '20-004';
update public.proyectos set nombre = 'Capacitaciones Técnicas' where codigo = '20-009';
update public.proyectos set nombre = 'Gestión de Operaciones' where codigo = '20-013';
update public.proyectos set nombre = 'Capacitaciones Seguridad' where codigo = '20-015';
update public.proyectos set nombre = 'Gestión Oferta Técnica' where codigo = '20-020';
