import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useTiposRegistroAdmin, useUpsertTipoRegistro } from "../hooks";

export function TiposRegistroTab() {
  const tiposQuery = useTiposRegistroAdmin();
  const upsert = useUpsertTipoRegistro();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("TRABAJO");
  const [requiereProyecto, setRequiereProyecto] = useState(false);
  const [esHoraExtra, setEsHoraExtra] = useState(false);

  function handleAgregar() {
    if (!codigo.trim() || !nombre.trim()) return;
    upsert.mutate({
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      categoria,
      requiere_proyecto: requiereProyecto,
      es_hora_extra: esHoraExtra,
      activo: true,
    });
    setCodigo("");
    setNombre("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      {tiposQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold">Requiere proyecto</th>
              <th className="px-4 py-3 font-semibold">Hora extra</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(tiposQuery.data ?? []).map((tipo) => (
              <tr key={tipo.id} className="border-t border-[#e5eaf1]">
                <td className="px-4 py-3 font-medium text-ink">{tipo.codigo}</td>
                <td className="px-4 py-3 text-ink-muted">{tipo.nombre}</td>
                <td className="px-4 py-3 text-ink-muted">{tipo.categoria}</td>
                <td className="px-4 py-3 text-ink-muted">{tipo.requiere_proyecto ? "Sí" : "No"}</td>
                <td className="px-4 py-3 text-ink-muted">{tipo.es_hora_extra ? "Sí" : "No"}</td>
                <td className="px-4 py-3">{tipo.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      upsert.mutate({
                        id: tipo.id,
                        codigo: tipo.codigo,
                        nombre: tipo.nombre,
                        categoria: tipo.categoria,
                        requiere_proyecto: tipo.requiere_proyecto,
                        es_hora_extra: tipo.es_hora_extra,
                        activo: !tipo.activo,
                      })
                    }
                    className="btn-outline min-h-[32px] px-3 text-xs"
                  >
                    {tipo.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-[#e5eaf1] bg-[#fbfcfe] p-4">
        <div>
          <label htmlFor="tipo-codigo" className="mb-1 block text-xs font-medium text-[#51617a]">
            Código
          </label>
          <input id="tipo-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="form-input w-24" />
        </div>
        <div className="flex-1">
          <label htmlFor="tipo-nombre" className="mb-1 block text-xs font-medium text-[#51617a]">
            Nombre
          </label>
          <input id="tipo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="form-input" />
        </div>
        <div>
          <label htmlFor="tipo-categoria" className="mb-1 block text-xs font-medium text-[#51617a]">
            Categoría
          </label>
          <select
            id="tipo-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="form-input"
          >
            <option value="TRABAJO">TRABAJO</option>
            <option value="AUSENCIA">AUSENCIA</option>
          </select>
        </div>
        <label className="flex items-center gap-1.5 pb-2.5 text-sm text-ink">
          <input type="checkbox" checked={requiereProyecto} onChange={(e) => setRequiereProyecto(e.target.checked)} />
          Requiere proyecto
        </label>
        <label className="flex items-center gap-1.5 pb-2.5 text-sm text-ink">
          <input type="checkbox" checked={esHoraExtra} onChange={(e) => setEsHoraExtra(e.target.checked)} />
          Es hora extra
        </label>
        <Button type="button" onClick={handleAgregar} isLoading={upsert.isPending} className="min-h-[42px]">
          Agregar
        </Button>
      </div>
    </div>
  );
}
