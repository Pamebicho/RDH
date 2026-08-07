import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FIXED_COST_CENTER_CODES } from "../domain";
import type { Proyecto } from "@/types/database.types";

interface ProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectosDisponibles: Proyecto[];
  proyectosSeleccionadosIds: string[];
  onSave: (proyectoIds: string[]) => void;
  isSaving: boolean;
}

export function ProjectsModal({
  open,
  onOpenChange,
  proyectosDisponibles,
  proyectosSeleccionadosIds,
  onSave,
  isSaving,
}: ProjectsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");

  const proyectosOpcionales = proyectosDisponibles.filter(
    (proyecto) => !(FIXED_COST_CENTER_CODES as readonly string[]).includes(proyecto.codigo),
  );

  const termino = busqueda.trim().toLowerCase();
  const proyectosFiltrados = proyectosOpcionales.filter(
    (proyecto) =>
      !termino || proyecto.codigo.toLowerCase().includes(termino) || proyecto.nombre.toLowerCase().includes(termino),
  );

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(proyectosSeleccionadosIds));
    setBusqueda("");
  }, [open, proyectosSeleccionadosIds]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Seleccionar centros de costo"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-h-[40px] px-3 text-sm">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => onSave(Array.from(selected))}
            isLoading={isSaving}
            className="min-h-[40px] px-3 text-sm"
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="mb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre…"
            aria-label="Buscar centro de costo"
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
        {proyectosFiltrados.map((proyecto) => (
          <label
            key={proyecto.id}
            htmlFor={`proyecto-${proyecto.id}`}
            className="flex items-center gap-2 rounded-control px-2 py-1.5 text-sm hover:bg-bg"
          >
            <input
              id={`proyecto-${proyecto.id}`}
              type="checkbox"
              checked={selected.has(proyecto.id)}
              onChange={() => toggle(proyecto.id)}
              className="h-4 w-4 rounded border-[#c4cddb] text-krontec-blue focus:ring-krontec-blue"
            />
            <span className="text-ink">
              {proyecto.codigo} — {proyecto.nombre}
            </span>
          </label>
        ))}
        {proyectosOpcionales.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-ink-muted">No hay otros centros de costo activos por ahora.</p>
        ) : proyectosFiltrados.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-ink-muted">No se encontraron centros de costo para "{busqueda}".</p>
        ) : null}
      </div>
    </Modal>
  );
}
