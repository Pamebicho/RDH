# Registro de Horas Krontec — App (React + Supabase)

Reconstrucción del prototipo estático (`../index.html`, `../pages/registro-horas.html`) como aplicación
profesional: React + TypeScript + Tailwind CSS en el frontend, Supabase (Postgres + Auth) como backend.

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
   Esto crea las tablas, las políticas de seguridad (RLS) y el catálogo inicial de centros de costo y períodos.
3. Ve a **Authentication → Providers** y confirma que **Email** esté habilitado.
4. (Opcional para probar) Ve a **Authentication → Users → Add user** y crea un usuario con correo
   `@krontec.cl` para iniciar sesión.
5. Ve a **Project Settings → API** y copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

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

## Estructura del proyecto

```
src/
  components/    UI compartida (Button, Modal, StatusBadge) y layout (AppShell, Header, Sidebar)
  config/        Configuración de entorno (dominio corporativo)
  features/
    auth/        Login, validación (zod), contexto de sesión de Supabase
    hours/       Registro de horas: lógica pura (domain.ts), estado (reducer.ts),
                 datos (api.ts, hooks.ts) y componentes de la pantalla
  lib/           Cliente de Supabase y de React Query
  pages/         Páginas de nivel de ruta (LoginPage, HoursRegisterPage)
  routes/        Guards de rutas protegidas/públicas
  types/         Tipos de la base de datos de Supabase
supabase/
  schema.sql     Esquema completo: tablas, RLS, catálogo inicial
tests/
  domain.test.ts         Tests de la lógica de cálculo de horas
  authValidation.test.ts Tests de validación del formulario de login
```

## Notas de diseño

- El período por defecto al abrir "Registro de horas" es Julio 2026 (`2026-07`), igual que el prototipo
  original. Puedes agregar más períodos insertando filas en `period_definitions` (tabla en Supabase).
- Al crear el período de un usuario por primera vez, se preseleccionan **todos** los centros de costo
  activos; el usuario los ajusta desde "Seleccionar centros". Esto reemplaza la selección fija que traía
  el prototipo (los centros "por defecto" eran una simulación, no una regla de negocio real).
- El botón "Iniciar sesión con Microsoft" queda visible pero informativo: la integración real con Azure AD
  vía Supabase queda para una etapa futura.
- El tope de 24 horas/día, copiar día/semana/mes anterior y la exportación a CSV funcionan igual que en el
  prototipo original — la lógica se migró 1:1 a `src/features/hours/domain.ts` (con tests).

## Próximos pasos sugeridos

- Conectar el botón de Microsoft a un proveedor Azure AD en Supabase Auth.
- Panel de administración para gestionar `cost_centers` y `period_definitions` sin entrar al dashboard de Supabase.
- Despliegue en Vercel o Netlify (build con `npm run build`, variables de entorno `VITE_*` en el panel del proveedor).
