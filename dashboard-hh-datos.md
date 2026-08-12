# ¿De dónde salen los datos del Dashboard HH? — paso a paso

Este documento explica, paso a paso, de dónde sale cada dato que se muestra en el dashboard de
inicio del Super Admin (`app/src/pages/HomePage.tsx`), y qué cálculo se hace con él. Todo el
código relevante vive en `app/src/features/home/hooks.ts` (cálculo) y `app/src/pages/HomePage.tsx`
(presentación).

No hay datos inventados ni "hardcodeados": todo se calcula en vivo desde las tablas de Supabase,
para el período que el usuario tenga seleccionado en el dropdown "Ver otro período".

## 1. Punto de partida: las 3 consultas base

Cuando seleccionás un período, `useResumenPeriodo(periodoId)` dispara 3 consultas:

1. **`fetchPlanillasDelPeriodo(periodoId)`** → todas las planillas semanales (`planillas_semanales`)
   que pertenecen a ese período (cualquiera sea su estado: borrador, enviada, aprobada, etc.).
2. **`fetchRegistrosPorPlanillas(planillaIds)`** → todos los `registros_horas` (filas día a día,
   con `proyecto_id`, `trabajador_id`, `horas`) que cuelgan de esas planillas.
3. **`useAdminProyectos()`** → el catálogo completo de `proyectos` (centros de costo), con su
   `codigo`, `nombre`, `activo` y `cliente_area`.

Todo lo demás (KPIs, gráficos, tablas) se calcula en el navegador a partir de estas 3 listas —
no hay más viajes a la base de datos.

## 2. Armar el mapa "horas por centro de costo"

```ts
const horasPorProyectoId = new Map<string, number>();
for (const registro of registrosQuery.data ?? []) {
  if (!registro.proyecto_id) continue; // ignora registros sin CC (vacaciones, licencias, etc.)
  horasPorProyectoId.set(
    registro.proyecto_id,
    (horasPorProyectoId.get(registro.proyecto_id) ?? 0) + Number(registro.horas),
  );
}
```

Se recorren todos los registros de horas del período y se suman las horas de cada uno, agrupadas
por `proyecto_id`. Los registros sin centro de costo (vacaciones, licencia, permiso, etc., que no
requieren proyecto) no entran en esta suma.

## 3. KPI "Horas registradas" y "Trabajadores"

```ts
const totalHoras = (registrosQuery.data ?? []).reduce((acc, r) => acc + Number(r.horas), 0);
const trabajadoresConHoras = new Set((registrosQuery.data ?? []).map((r) => r.trabajador_id)).size;
```

- **Horas registradas**: suma de **todos** los registros del período (con o sin proyecto asociado
  — a diferencia del paso 2, aquí sí se cuentan vacaciones/licencias/permisos).
- **Trabajadores**: cantidad de `trabajador_id` distintos que tienen al menos un registro en el
  período (no es la cantidad de trabajadores activos en la empresa, es cuántos efectivamente
  cargaron horas).

## 4. KPI "CC utilizados" y "CC sin movimiento" + tabla "Detalle por Centro de Costo"

```ts
const proyectosActivos = (proyectosQuery.data ?? []).filter((p) => p.activo);

const centrosCostoDetalle = proyectosActivos
  .map((p) => ({ codigo: p.codigo, nombre: p.nombre, horas: horasPorProyectoId.get(p.id) ?? 0 }))
  .sort((a, b) => b.horas - a.horas);

const ccUtilizados = centrosCostoDetalle.filter((c) => c.horas > 0).length;
const ccSinMovimiento = centrosCostoDetalle.length - ccUtilizados;
```

Paso a paso:

1. Se toman solo los centros de costo **activos** del catálogo (los desactivados no se muestran).
2. A cada uno se le pega su total de horas del paso 2 (o `0` si nadie cargó horas ahí este
   período).
3. Se ordena de mayor a menor horas → esta lista completa es la que alimenta la tabla
   **"Detalle por Centro de Costo"**.
4. **CC utilizados** = cuántos de esos tienen horas > 0 en el período.
5. **CC sin movimiento** = el resto (activos en el catálogo, pero sin ninguna hora cargada este
   período).

## 5. Gráfico "Top 10 Centros de Costo"

```ts
const top10CentrosCosto = resumenPeriodo.centrosCostoDetalle
  .slice(0, 10)
  .map((item) => ({ label: item.codigo, sublabel: item.nombre, horas: item.horas }));
```

Es simplemente los primeros 10 elementos de `centrosCostoDetalle` (ya viene ordenado de mayor a
menor horas desde el paso 4). El gráfico de barras horizontales muestra el **código** como
etiqueta principal, y el **nombre completo** aparece al pasar el mouse (tooltip).

## 6. Gráfico "Distribución de HH por Cliente/Área" + tabla "Detalle por Cliente/Área"

```ts
const horasPorClienteArea = new Map<string, number>();
for (const [proyectoId, horas] of horasPorProyectoId) {
  const clienteArea = proyectoPorId.get(proyectoId)?.cliente_area || "Sin categoría";
  horasPorClienteArea.set(clienteArea, (horasPorClienteArea.get(clienteArea) ?? 0) + horas);
}

const clienteAreaDetalle = [...horasPorClienteArea.entries()]
  .map(([clienteArea, horas]) => ({ clienteArea, horas }))
  .sort((a, b) => b.horas - a.horas);
```

Paso a paso:

1. Se recorre el mapa "horas por centro de costo" del paso 2 (uno por uno).
2. Para cada centro de costo, se busca a qué **Cliente/Área** pertenece, según el campo
   `cliente_area` del proyecto (editable desde Configuración → Proyectos).
3. Si ese centro de costo **no tiene** `cliente_area` asignado, sus horas se agrupan bajo la
   categoría **"Sin categoría"** — no se inventa ni se fuerza a otra categoría. Esto es intencional:
   así queda visible y trazable qué parte de las horas todavía no está clasificada, en vez de
   ocultarlo.
4. Se suman las horas de todos los CC que caen en la misma categoría.
5. Se ordena de mayor a menor → esta lista alimenta tanto el gráfico de barras horizontales
   "Distribución de HH por Cliente/Área" como la tabla **"Detalle por Cliente/Área"**.

El campo `cliente_area` se carga y edita a mano en **Configuración → Proyectos** (columna
"Cliente/Área" de la tabla, o al agregar un centro de costo nuevo). No existe una regla automática
que lo asigne — es responsabilidad de quien administra el catálogo.

## 7. Gráfico "Concentración de HH" (Pareto)

```ts
let acumulado = 0;
const paretoData = clienteAreaDetalle.map((item) => {
  acumulado += item.horas;
  return { ...item, porcentajeAcumulado: totalHoras > 0 ? (acumulado / totalHoras) * 100 : 0 };
});
```

Parte de la misma lista `clienteAreaDetalle` del paso 6 (ya ordenada de mayor a menor horas), y le
agrega un porcentaje acumulado:

1. Se recorre la lista en orden (de la categoría con más horas a la de menos).
2. En cada paso se suma esa categoría al acumulado corrido.
3. Se calcula qué porcentaje del total de horas del período (`totalHoras`, paso 3) representa ese
   acumulado hasta ese punto.

El gráfico dibuja las **barras** (horas por categoría) contra el eje izquierdo, y la **línea**
(porcentaje acumulado) contra un eje derecho de 0 a 100%, con una línea de referencia punteada en
el 80% — el típico gráfico de Pareto para identificar qué pocas categorías concentran la mayoría
de las horas.

## 8. Resumen visual del flujo

```
registros_horas (del período)
        │
        ├─→ suma total ─────────────────────────────→ KPI "Horas registradas"
        ├─→ trabajador_id distintos ─────────────────→ KPI "Trabajadores"
        │
        └─→ agrupar por proyecto_id ─→ horasPorProyectoId
                    │
                    ├─→ cruzar con catálogo `proyectos` (activos)
                    │         ├─→ ordenar desc ───────→ tabla "Detalle por Centro de Costo"
                    │         ├─→ contar horas>0/=0 ──→ KPI "CC utilizados" / "CC sin movimiento"
                    │         └─→ primeros 10 ────────→ gráfico "Top 10 Centros de Costo"
                    │
                    └─→ agrupar por proyecto.cliente_area (o "Sin categoría")
                              ├─→ ordenar desc ───────→ gráfico "Distribución por Cliente/Área"
                              │                          y tabla "Detalle por Cliente/Área"
                              └─→ % acumulado ─────────→ gráfico "Concentración de HH" (Pareto)
```

## 9. Dónde tocar cada cosa

| Querés cambiar... | Archivo |
|---|---|
| Cómo se calculan los KPIs / agrupaciones | `app/src/features/home/hooks.ts` → `useResumenPeriodo` |
| Cómo se dibujan los gráficos / tablas | `app/src/pages/HomePage.tsx` |
| A qué Cliente/Área pertenece un centro de costo | Configuración → Proyectos (columna "Cliente/Área"), o directo en `proyectos.cliente_area` en Supabase |
| Qué centros de costo existen / están activos | Configuración → Proyectos |
