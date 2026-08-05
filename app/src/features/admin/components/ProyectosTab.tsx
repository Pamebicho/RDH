import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  useAdminProyectos,
  useAsignacionesDeProyecto,
  useAsignarAdministrador,
  useRevocarAsignacion,
  useTrabajadoresAdmin,
  useUpsertProyecto,
} from "../hooks";

export function ProyectosTab() {
  const proyectosQuery = useAdminProyectos();
  const upsertProyecto = useUpsertProyecto();
  const trabajadoresQuery = useTrabajadoresAdmin();

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string | null>(null);
  const [administradorAAsignar, setAdministradorAAsignar] = useState("");

  const asignacionesQuery = useAsignacionesDeProyecto(proyectoSeleccionado);
  const asignarAdministrador = useAsignarAdministrador(proyectoSeleccionado);
  const revocarAsignacion = useRevocarAsignacion(proyectoSeleccionado);

  function handleAgregarProyecto() {
    if (!codigo.trim() || !nombre.trim()) return;
    upsertProyecto.mutate({ codigo: codigo.trim(), nombre: nombre.trim(), activo: true });
    setCodigo("");
    setNombre("");
  }

  const trabajadorPorId = new Map((trabajadoresQuery.data ?? []).map((t) => [t.id, t]));

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        {proyectosQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(proyectosQuery.data ?? []).map((proyecto) => (
                <tr key={proyecto.id} className="border-t border-[#e5eaf1]">
                  <td className="px-4 py-3 font-medium text-ink">{proyecto.codigo}</td>
                  <td className="px-4 py-3 text-ink-muted">{proyecto.nombre}</td>
                  <td className="px-4 py-3">{proyecto.activo ? "Activo" : "Inactivo"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        upsertProyecto.mutate({
                          id: proyecto.id,
                          codigo: proyecto.codigo,
                          nombre: proyecto.nombre,
                          activo: !proyecto.activo,
                        })
                      }
                      className="btn-outline min-h-[32px] px-3 text-xs"
                    >
                      {proyecto.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setProyectoSeleccionado(proyecto.id)}
                      className="btn-outline min-h-[32px] px-3 text-xs"
                    >
                      Administradores
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap items-end gap-3 border-t border-[#e5eaf1] bg-[#fbfcfe] p-4">
          <div>
            <label htmlFor="proyecto-codigo" className="mb-1 block text-xs font-medium text-[#51617a]">
              Código
            </label>
            <input
              id="proyecto-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="form-input w-28"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="proyecto-nombre" className="mb-1 block text-xs font-medium text-[#51617a]">
              Nombre
            </label>
            <input id="proyecto-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="form-input" />
          </div>
          <Button type="button" onClick={handleAgregarProyecto} isLoading={upsertProyecto.isPending} className="min-h-[42px]">
            Agregar proyecto
          </Button>
        </div>
      </div>

      {proyectoSeleccionado ? (
        <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
          <h3 className="mb-3 text-sm font-bold text-ink">
            Administradores de {proyectosQuery.data?.find((p) => p.id === proyectoSeleccionado)?.codigo}
          </h3>

          <ul className="mb-3 space-y-1.5 text-sm">
            {(asignacionesQuery.data ?? []).map((asignacion) => (
              <li key={asignacion.id} className="flex items-center justify-between gap-3">
                <span>
                  {trabajadorPorId.get(asignacion.administrador_id)?.correo_corporativo ?? asignacion.administrador_id}
                </span>
                <button
                  type="button"
                  onClick={() => revocarAsignacion.mutate(asignacion.id)}
                  className="text-xs text-danger hover:underline"
                >
                  Quitar
                </button>
              </li>
            ))}
            {!asignacionesQuery.data?.length ? (
              <li className="text-ink-muted">Sin administradores asignados todavía.</li>
            ) : null}
          </ul>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="administrador-select" className="mb-1 block text-xs font-medium text-[#51617a]">
                Trabajador
              </label>
              <select
                id="administrador-select"
                value={administradorAAsignar}
                onChange={(event) => setAdministradorAAsignar(event.target.value)}
                className="form-input"
              >
                <option value="">Selecciona un trabajador…</option>
                {(trabajadoresQuery.data ?? []).map((trabajador) => (
                  <option key={trabajador.id} value={trabajador.id}>
                    {trabajador.correo_corporativo}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              onClick={() => administradorAAsignar && asignarAdministrador.mutate(administradorAAsignar)}
              isLoading={asignarAdministrador.isPending}
              className="min-h-[42px]"
            >
              Asignar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
