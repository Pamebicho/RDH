# Registro de Horas Krontec — App (React + Supabase)

Sistema de registro de horas: React + TypeScript + Tailwind CSS en el frontend, Supabase (Postgres + Auth)
como backend. Modelo de datos completo (22 tablas) con roles (Trabajador, Administrador, Lector, Super
Admin), planillas semanales con flujo de aprobación, tipos de registro (ordinarias, extra, vacaciones,
licencia, permiso, ausencia, capacitación) y jornadas configurables.

## Requisitos previos

Instala esto una sola vez en tu equipo (no venían instalados):

1. **Node.js LTS** — descárgalo de [nodejs.org](https://nodejs.org) (instalador de Windows, deja todas las
   opciones por defecto). Verifica con `node -v` en una terminal nueva.
2. **Git** — descárgalo de [git-scm.com](https://git-scm.com/download/win) (instalador de Windows, opciones
   por defecto). Verifica con `git -v`.

Cierra y vuelve a abrir la terminal/VS Code después de instalar para que el `PATH` se actualice.

## 1. Crear el proyecto en Supabase

1. Crea una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** → pega el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql) → **Run**.
   Esto crea las 22 tablas, las políticas de seguridad (RLS) por rol, las funciones helper, los triggers y
   el catálogo inicial (roles, tipos de registro, jornada estándar, proyectos, un período de ejemplo).
   **Advertencia:** si ya habías corrido una versión anterior del esquema, este script empieza borrando
   esas tablas viejas (`profiles`, `cost_centers`, `periods`, etc.) — se pierden los datos de prueba
   cargados con esa versión.
3. Ve a **Authentication → Providers** y confirma que **Email** esté habilitado.
4. Ve a **Authentication → Users → Add user** y crea uno o más usuarios con correo `@krontec.cl`. Al
   iniciar sesión por primera vez, un trigger les crea automáticamente su fila en `trabajadores` con el
   rol **TRABAJADOR**. Para probar Administrador/Lector/Super Admin, asigna esos roles desde la pantalla
   **Administración → Personas y roles** (necesitas que al menos un usuario tenga SUPER_ADMIN — asígnaselo
   manualmente la primera vez desde el SQL Editor, ver sección siguiente).
5. Ve a **Project Settings → API** y copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### Asignar el primer Super Admin

La app no tiene forma de auto-asignarse SUPER_ADMIN (por diseño). Después de crear tu primer usuario e
iniciar sesión una vez (para que el trigger le cree su `trabajador`), corre esto en el SQL Editor
reemplazando el correo:

```sql
insert into public.trabajador_roles (trabajador_id, rol_id, activo)
select t.id, r.id, true
from public.trabajadores t, public.roles r
where t.correo_corporativo = 'tu-correo@krontec.cl'
  and r.codigo = 'SUPER_ADMIN'
on conflict (trabajador_id, rol_id) do update set activo = true;
```

## 2. Configurar variables de entorno

```powershell
Copy-Item .env.example .env.local
```

Edita `.env.local` con los valores obtenidos en el paso anterior.

## 3. Instalar dependencias y ejecutar

```powershell
cd app
npm install
npm run dev
```

Abre la URL que muestra la terminal (por defecto `http://localhost:5173`).

## Scripts disponibles

| Comando           | Qué hace                                   |
| ------------------ | ------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con recarga en vivo |
| `npm run build`     | Compila TypeScript y genera el build de producción en `dist/` |
| `npm run preview`   | Sirve localmente el build de producción     |
| `npm run lint`      | Revisa el código con ESLint                 |
| `npm run test`      | Corre los tests una vez (Vitest)            |
| `npm run test:watch`| Corre los tests en modo watch               |
| `npm run format`    | Formatea el código con Prettier             |

## Roles y pantallas

| Pantalla | Trabajador | Administrador | Lector | Super Admin |
|---|---|---|---|---|
| `/registro-horas` — cargar horas semanales | ✅ (propias) | ✅ (propias) | ❌ | ✅ |
| `/aprobaciones` — aprobar/devolver planillas | ❌ | ✅ (solo sus proyectos) | ❌ | ✅ (todas) |
| `/reportes` — reportes de solo lectura | ❌ | ❌ | ✅ (según su alcance) | ✅ |
| `/administracion` — catálogos, personas y roles | ❌ | ❌ | ❌ | ✅ |

Todo el filtrado está reforzado con Row Level Security en Supabase (no solo en la interfaz): un
Administrador nunca recibe filas de proyectos que no administra, y un Lector nunca recibe datos fuera de
lo que su fila en `lector_alcances` autoriza, aunque intente acceder directamente por URL o API.

## Estructura del proyecto

```
src/
  components/    UI compartida (Button, Modal, StatusBadge) y layout (AppShell, Header, Sidebar)
  config/        Configuración de entorno (dominio corporativo)
  features/
    auth/        Login, validación (zod), contexto de sesión de Supabase
    workforce/   Perfil del trabajador actual y sus roles (WorkforceProvider/useWorkforce)
    hours/       Registro de horas semanal: lógica pura (domain.ts), estado (reducer.ts),
                 datos (api.ts, hooks.ts) y componentes (flujo Trabajador)
    approvals/   Aprobación de planillas semanales (flujo Administrador)
    reports/     Reportes agregados de solo lectura (flujo Lector)
    admin/       Catálogos y gestión de personas/roles (flujo Super Admin)
  lib/           Cliente de Supabase y de React Query
  pages/         Páginas de nivel de ruta
  routes/        Guards de rutas protegidas/públicas/por rol
  types/         Tipos de la base de datos de Supabase (22 tablas)
supabase/
  schema.sql     Esquema completo: 22 tablas, RLS por rol, funciones helper, triggers, catálogo inicial
tests/
  domain.test.ts         Tests de la lógica de cálculo de horas semanales
  authValidation.test.ts Tests de validación del formulario de login
```

## Notas de diseño

- Los períodos siguen un ciclo de nómina (día 25 al día 24) y se dividen en semanas; cada semana es su
  propia planilla (`planillas_semanales`) con su propio envío y aprobación — no se envía el período
  completo de una vez.
- Las horas esperadas por día salen de la jornada vigente del trabajador (`jornadas`/`jornada_dias`), no
  de un valor fijo por período. Los feriados (`feriados`) descuentan horas esperadas ese día.
- Al seleccionar proyectos para un período, cada uno se muestra como columna de horas ordinarias; los
  tipos de registro sin proyecto (extraordinarias, vacaciones, licencia, permiso, ausencia, capacitación)
  aparecen como columnas fijas adicionales.
- El botón "Iniciar sesión con Microsoft" queda visible pero informativo: la integración real con Azure AD
  vía Supabase queda para una etapa futura.

## Próximos pasos sugeridos

- Conectar el botón de Microsoft a un proveedor Azure AD en Supabase Auth.
- Detalle de horas extra por proyecto (`detalle_horas_extra`) con su propio flujo de revisión.
- Despliegue en Vercel o Netlify (build con `npm run build`, variables de entorno `VITE_*` en el panel del proveedor).
