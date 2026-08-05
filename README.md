# Sistema de Registro de Horas Krontec

Registro mensual de horas trabajadas por centro de costo, con autenticación e ingreso corporativo.

El código vive en [`app/`](./app/README.md): React + TypeScript + Tailwind CSS en el frontend, Supabase
(Postgres + Auth) como backend. Ver ese README para requisitos, instalación y configuración de Supabase.

## Inicio rápido

```powershell
cd app
npm install
Copy-Item .env.example .env.local   # completa con tus credenciales de Supabase
npm run dev
```
