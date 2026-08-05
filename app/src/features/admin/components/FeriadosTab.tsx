import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDateCl } from "@/utils/date";
import { useFeriados, useUpsertFeriado } from "../hooks";

export function FeriadosTab() {
  const feriadosQuery = useFeriados();
  const upsert = useUpsertFeriado();
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState("");

  function handleAgregar() {
    if (!fecha || !nombre.trim()) return;
    upsert.mutate({ fecha, nombre: nombre.trim(), activo: true });
    setFecha("");
    setNombre("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      {feriadosQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(feriadosQuery.data ?? []).map((feriado) => (
              <tr key={feriado.id} className="border-t border-[#e5eaf1]">
                <td className="px-4 py-3 font-medium text-ink">{formatDateCl(feriado.fecha)}</td>
                <td className="px-4 py-3 text-ink-muted">{feriado.nombre}</td>
                <td className="px-4 py-3">{feriado.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      upsert.mutate({
                        id: feriado.id,
                        fecha: feriado.fecha,
                        nombre: feriado.nombre,
                        tipo: feriado.tipo,
                        activo: !feriado.activo,
                      })
                    }
                    className="btn-outline min-h-[32px] px-3 text-xs"
                  >
                    {feriado.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-[#e5eaf1] bg-[#fbfcfe] p-4">
        <div>
          <label htmlFor="feriado-fecha" className="mb-1 block text-xs font-medium text-[#51617a]">
            Fecha
          </label>
          <input
            id="feriado-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="feriado-nombre" className="mb-1 block text-xs font-medium text-[#51617a]">
            Nombre
          </label>
          <input id="feriado-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="form-input" />
        </div>
        <Button type="button" onClick={handleAgregar} isLoading={upsert.isPending} className="min-h-[42px]">
          Agregar
        </Button>
      </div>
    </div>
  );
}
