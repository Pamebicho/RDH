import { useEffect, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Proyecto } from "@/types/database.types";
import { useAdminProyectos, useUpsertProyecto } from "../hooks";

const initialForm = { codigo: "", nombre: "", clienteArea: "" };

function AddProyectoModal({
  open,
  onOpenChange,
  proyecto = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyecto?: Proyecto | null;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const upsertProyecto = useUpsertProyecto();
  const isEditing = Boolean(proyecto);

  useEffect(() => {
    if (!open) return;
    setForm(
      proyecto
        ? { codigo: proyecto.codigo, nombre: proyecto.nombre, clienteArea: proyecto.cliente_area ?? "" }
        : initialForm,
    );
    setError(null);
  }, [open, proyecto]);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setForm(initialForm);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (!form.codigo.trim() || !form.nombre.trim() || !form.clienteArea.trim()) {
      setError("Código, nombre y Cliente/Área son obligatorios.");
      return;
    }
    setError(null);
    upsertProyecto.mutate(
      {
        id: proyecto?.id,
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        cliente_area: form.clienteArea.trim(),
        activo: proyecto?.activo ?? true,
      },
      { onSuccess: () => handleClose(false) },
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title={isEditing ? "Editar centro de costo" : "Agregar centro de costo"}
      description={
        isEditing
          ? "Actualiza el código, nombre y Cliente/Área de este centro de costo."
          : "Registra el código, nombre y Cliente/Área del nuevo centro de costo."
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleClose(false)} className="min-h-[40px] px-3 text-sm">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={upsertProyecto.isPending} className="min-h-[40px] px-3 text-sm">
            {isEditing ? "Guardar cambios" : "Agregar"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5">
        <div>
          <label htmlFor="nuevo-proyecto-codigo" className="mb-1 block text-xs font-medium text-[#51617a]">
            Código
          </label>
          <input
            id="nuevo-proyecto-codigo"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            className="form-input"
          />
        </div>
        <div>
          <label htmlFor="nuevo-proyecto-nombre" className="mb-1 block text-xs font-medium text-[#51617a]">
            Nombre
          </label>
          <input
            id="nuevo-proyecto-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="form-input"
          />
        </div>
        <div>
          <label htmlFor="nuevo-proyecto-cliente-area" className="mb-1 block text-xs font-medium text-[#51617a]">
            Cliente/Área
          </label>
          <input
            id="nuevo-proyecto-cliente-area"
            value={form.clienteArea}
            onChange={(e) => setForm((f) => ({ ...f, clienteArea: e.target.value }))}
            className="form-input"
          />
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </Modal>
  );
}

export function ProyectosTab() {
  const proyectosQuery = useAdminProyectos();
  const upsertProyecto = useUpsertProyecto();

  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proyectoEditando, setProyectoEditando] = useState<Proyecto | null>(null);

  function handleAbrirAgregar() {
    setProyectoEditando(null);
    setModalAbierto(true);
  }

  function handleAbrirEditar(proyecto: Proyecto) {
    setProyectoEditando(proyecto);
    setModalAbierto(true);
  }

  function handleCerrarModal(open: boolean) {
    setModalAbierto(open);
    if (!open) setProyectoEditando(null);
  }

  const termino = busqueda.trim().toLowerCase();
  const proyectosFiltrados = (proyectosQuery.data ?? []).filter(
    (proyecto) =>
      !termino || proyecto.codigo.toLowerCase().includes(termino) || proyecto.nombre.toLowerCase().includes(termino),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e5eaf1] bg-[#fbfcfe] p-4">
        <div>
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
        <Button type="button" onClick={handleAbrirAgregar} className="min-h-[42px]">
          Agregar proyecto
        </Button>
      </div>

      {proyectosQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">N°</th>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Cliente/Área</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="w-[160px] px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectosFiltrados.map((proyecto, index) => (
                <tr key={proyecto.id} className="border-t border-[#e5eaf1]">
                  <td className="px-4 py-3 text-ink-muted">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-ink">{proyecto.codigo}</td>
                  <td className="px-4 py-3 text-ink-muted">{proyecto.nombre}</td>
                  <td className="px-4 py-3 text-ink-muted">{proyecto.cliente_area || "Sin categoría"}</td>
                  <td className="px-4 py-3">{proyecto.activo ? "Activo" : "Inactivo"}</td>
                  <td className="w-[160px] px-4 py-3 text-right">
                    <div className="flex shrink-0 justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleAbrirEditar(proyecto)}
                        aria-label={`Editar ${proyecto.codigo}`}
                        className="btn-outline min-h-[32px] w-[32px] shrink-0 justify-center px-0"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
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
                        className="btn-outline min-h-[32px] w-[92px] shrink-0 justify-center px-3 text-xs"
                      >
                        {proyecto.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!proyectosFiltrados.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted">
                    No se encontraron centros de costo para "{busqueda}".
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <AddProyectoModal open={modalAbierto} onOpenChange={handleCerrarModal} proyecto={proyectoEditando} />
    </div>
  );
}
