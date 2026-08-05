import { useState } from "react";
import { Button } from "@/components/ui/Button";

export interface SimpleCatalogItem {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

interface SimpleCatalogEditorProps {
  items: SimpleCatalogItem[];
  isLoading: boolean;
  isSaving: boolean;
  onSave: (item: { id?: string; codigo: string; nombre: string; activo: boolean }) => void;
}

export function SimpleCatalogEditor({ items, isLoading, isSaving, onSave }: SimpleCatalogEditorProps) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");

  function handleAgregar() {
    if (!codigo.trim() || !nombre.trim()) return;
    onSave({ codigo: codigo.trim(), nombre: nombre.trim(), activo: true });
    setCodigo("");
    setNombre("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      {isLoading ? (
        <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#e5eaf1]">
                <td className="px-4 py-3 font-medium text-ink">{item.codigo}</td>
                <td className="px-4 py-3 text-ink-muted">{item.nombre}</td>
                <td className="px-4 py-3">{item.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSave({ id: item.id, codigo: item.codigo, nombre: item.nombre, activo: !item.activo })}
                    className="btn-outline min-h-[32px] px-3 text-xs"
                  >
                    {item.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-[#e5eaf1] bg-[#fbfcfe] p-4">
        <div>
          <label htmlFor="catalogo-codigo" className="mb-1 block text-xs font-medium text-[#51617a]">
            Código
          </label>
          <input
            id="catalogo-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="form-input w-32"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="catalogo-nombre" className="mb-1 block text-xs font-medium text-[#51617a]">
            Nombre
          </label>
          <input id="catalogo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="form-input" />
        </div>
        <Button type="button" onClick={handleAgregar} isLoading={isSaving} className="min-h-[42px]">
          Agregar
        </Button>
      </div>
    </div>
  );
}
