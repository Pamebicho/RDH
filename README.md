# Sistema de Registro de Horas Krontec

Prototipo frontend ordenado para el registro mensual de horas trabajadas por centro de costo.

## Tecnologías

- HTML5
- Bootstrap 5.3
- Bootstrap Icons
- CSS modular
- JavaScript con módulos ES
- LocalStorage para la demostración temporal

## Pantallas disponibles

- `index.html`: inicio de sesión.
- `pages/registro-horas.html`: registro mensual de horas por centro de costo.

## Funciones disponibles en la demostración

- Validación de correo corporativo `@krontec.cl`.
- Redirección desde el login hacia el registro de horas.
- Selección de centros de costo utilizados durante el período.
- Ingreso de horas por día y centro de costo.
- Cálculo automático de totales diarios, por centro y del período.
- Copia del día hábil anterior y de la semana anterior.
- Guardado local en el navegador.
- Exportación CSV compatible con Microsoft Excel.
- Envío demostrativo a aprobación y bloqueo del período.
- Diseño responsivo con menú lateral para escritorio y menú móvil.

## Ejecución

1. Abrir la carpeta completa en Visual Studio Code.
2. Ejecutar `index.html` con Live Server.
3. Usar un correo terminado en `@krontec.cl` y una contraseña de al menos 6 caracteres.

No abras los archivos HTML directamente con doble clic: los módulos JavaScript funcionan correctamente mediante un servidor local como Live Server.

## Siguiente etapa

Este prototipo (HTML/Bootstrap/LocalStorage) se mantiene como referencia visual. La reconstrucción activa
del sistema —React + TypeScript + Tailwind CSS en el frontend, Supabase (Postgres + Auth) como backend—
vive en [`app/`](./app/README.md). Ver ese README para instrucciones de instalación y configuración de
Supabase.
