import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAdminProyectos, useUpsertProyecto } from "../hooks";

export function ProyectosTab() {
  const proyectosQuery = useAdminProyectos();
  const upsertProyecto = useUpsertProyecto();

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [busqueda, setBusqueda] = useState("");

  function handleAgregarProyecto() {
    if (!codigo.trim() || !nombre.trim()) return;
    upsertProyecto.mutate({ codigo: codigo.trim(), nombre: nombre.trim(), activo: true });
    setCodigo("");
    setNombre("");
  }

  const termino = busqueda.trim().toLowerCase();
  const proyectosFiltrados = (proyectosQuery.data ?? []).filter(
    (proyecto) =>
      !termino || proyecto.codigo.toLowerCase().includes(termino) || proyecto.nombre.toLowerCase().includes(termino),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      <div className="flex flex-wrap items-end gap-3 border-b border-[#e5eaf1] bg-[#fbfcfe] p-4">
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

      <div className="border-b border-[#e5eaf1] p-4">
        <label htmlFor="proyecto-busqueda" className="mb-1 block text-xs font-medium text-[#51617a]">
          Buscar centro de costo
        </label>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="proyecto-busqueda"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre…"
            className="form-input pl-9"
          />
        </div>
      </div>

      {proyectosQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {proyectosFiltrados.map((proyecto) => (
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
                </tr>
              ))}
              {!proyectosFiltrados.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                    No se encontraron centros de costo para "{busqueda}".
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
