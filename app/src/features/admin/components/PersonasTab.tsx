import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Trabajador } from "@/types/database.types";
import { useCargos, useRolesCatalogo, useSetTrabajadorActivo, useTodosTrabajadorRoles, useTrabajadoresAdmin } from "../hooks";
import { AddTrabajadorModal } from "./AddTrabajadorModal";

type Columna = "nombres" | "apellidos" | "rut" | "cargo" | "jefatura";
type Direccion = "asc" | "desc";

const COLUMNAS: { key: Columna; label: string }[] = [
  { key: "nombres", label: "Nombre" },
  { key: "apellidos", label: "Apellido" },
  { key: "rut", label: "RUT" },
  { key: "cargo", label: "Cargo" },
  { key: "jefatura", label: "Jefatura" },
];

export function PersonasTab() {
  const trabajadoresQuery = useTrabajadoresAdmin();
  const cargosQuery = useCargos();
  const rolesQuery = useRolesCatalogo();
  const trabajadorRolesQuery = useTodosTrabajadorRoles();
  const [modalOpen, setModalOpen] = useState(false);
  const [trabajadorAEditar, setTrabajadorAEditar] = useState<Trabajador | null>(null);
  const [trabajadorAEliminar, setTrabajadorAEliminar] = useState<Trabajador | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<{ columna: Columna; direccion: Direccion } | null>(null);
  const setActivo = useSetTrabajadorActivo();

  const cargoPorId = new Map((cargosQuery.data ?? []).map((cargo) => [cargo.id, cargo.nombre]));
  const rolPorId = new Map((rolesQuery.data ?? []).map((rol) => [rol.id, rol.nombre]));

  const rolesPorTrabajador = new Map<string, string[]>();
  for (const tr of trabajadorRolesQuery.data ?? []) {
    const nombreRol = rolPorId.get(tr.rol_id);
    if (!nombreRol) continue;
    const lista = rolesPorTrabajador.get(tr.trabajador_id) ?? [];
    lista.push(nombreRol);
    rolesPorTrabajador.set(tr.trabajador_id, lista);
  }

  function ordenarPor(columna: Columna) {
    setOrden((actual) => {
      if (!actual || actual.columna !== columna) return { columna, direccion: "asc" };
      if (actual.direccion === "asc") return { columna, direccion: "desc" };
      return null;
    });
  }

  const trabajadoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    let lista = trabajadoresQuery.data ?? [];

    if (termino) {
      lista = lista.filter((trabajador) => {
        const cargoNombre = trabajador.cargo_id ? cargoPorId.get(trabajador.cargo_id) ?? "" : "";
        const rolesNombre = (rolesPorTrabajador.get(trabajador.id) ?? []).join(" ");
        return [
          trabajador.nombres,
          trabajador.apellidos,
          trabajador.rut,
          trabajador.jefatura,
          trabajador.correo_corporativo,
          cargoNombre,
          rolesNombre,
        ]
          .filter(Boolean)
          .some((valor) => valor!.toLowerCase().includes(termino));
      });
    }

    if (orden) {
      const { columna, direccion } = orden;
      lista = [...lista].sort((a, b) => {
        const valorDe = (trabajador: Trabajador) =>
          columna === "cargo"
            ? (trabajador.cargo_id ? cargoPorId.get(trabajador.cargo_id) : "") ?? ""
            : trabajador[columna] ?? "";
        const comparacion = valorDe(a).localeCompare(valorDe(b), "es", { sensitivity: "base" });
        return direccion === "asc" ? comparacion : -comparacion;
      });
    }

    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabajadoresQuery.data, busqueda, orden, cargosQuery.data]);

  function abrirNuevo() {
    setTrabajadorAEditar(null);
    setModalOpen(true);
  }

  function abrirEditar(trabajador: Trabajador) {
    setTrabajadorAEditar(trabajador);
    setModalOpen(true);
  }

  function handleEliminarClick(trabajador: Trabajador) {
    if (!trabajador.activo) {
      setActivo.mutate({ id: trabajador.id, activo: true });
      return;
    }
    setTrabajadorAEliminar(trabajador);
  }

  function confirmarEliminar() {
    if (!trabajadorAEliminar) return;
    setActivo.mutate({ id: trabajadorAEliminar.id, activo: false });
    setTrabajadorAEliminar(null);
  }

  const nombreAEliminar = trabajadorAEliminar
    ? [trabajadorAEliminar.nombres, trabajadorAEliminar.apellidos].filter(Boolean).join(" ") || "este trabajador"
    : "";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={abrirNuevo} className="min-h-[40px] px-3 text-sm">
          <UserPlus className="h-4 w-4" aria-hidden />
          Agregar trabajador
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        <div className="border-b border-[#e5eaf1] p-4">
          <label htmlFor="trabajador-busqueda" className="mb-1 block text-xs font-medium text-[#51617a]">
            Buscar trabajador
          </label>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="trabajador-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, apellido, RUT, cargo…"
              className="form-input pl-9"
            />
          </div>
        </div>

        {trabajadoresQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#f8fbff] text-xs font-semibold uppercase tracking-wide text-[#51617a]">
                <tr>
                  <th className="px-4 py-3">N°</th>
                  {COLUMNAS.map((columna) => (
                    <th key={columna.key} className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => ordenarPor(columna.key)}
                        className="flex items-center gap-1 hover:text-krontec-blue"
                      >
                        {columna.label}
                        {orden?.columna === columna.key ? (
                          orden.direccion === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eaf1]">
                {trabajadoresFiltrados.map((trabajador, index) => (
                  <tr key={trabajador.id} className={!trabajador.activo ? "opacity-50" : ""}>
                    <td className="px-4 py-3 text-ink-muted">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {trabajador.nombres || "—"}
                      {!trabajador.activo ? <span className="ml-1 text-xs text-ink-muted">(Inactivo)</span> : null}
                    </td>
                    <td className="px-4 py-3 text-ink">{trabajador.apellidos || "—"}</td>
                    <td className="px-4 py-3 text-ink">{trabajador.rut || "—"}</td>
                    <td className="px-4 py-3 text-ink">
                      {trabajador.cargo_id ? cargoPorId.get(trabajador.cargo_id) ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink">{trabajador.jefatura || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(rolesPorTrabajador.get(trabajador.id) ?? []).length ? (
                          (rolesPorTrabajador.get(trabajador.id) ?? []).map((rol) => (
                            <span
                              key={rol}
                              className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-xs font-medium text-krontec-blue"
                            >
                              {rol}
                            </span>
                          ))
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(trabajador)}
                          title="Editar"
                          aria-label={`Editar a ${trabajador.nombres ?? trabajador.correo_corporativo}`}
                          className="rounded-md p-1.5 text-krontec-blue hover:bg-[#eef4ff]"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarClick(trabajador)}
                          title={trabajador.activo ? "Eliminar" : "Reactivar"}
                          aria-label={
                            trabajador.activo
                              ? `Eliminar a ${trabajador.nombres ?? trabajador.correo_corporativo}`
                              : `Reactivar a ${trabajador.nombres ?? trabajador.correo_corporativo}`
                          }
                          className="rounded-md p-1.5 text-danger hover:bg-[#fdeeee]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!trabajadoresFiltrados.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">
                      {busqueda ? `No se encontraron trabajadores para "${busqueda}".` : "No hay trabajadores registrados."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddTrabajadorModal
        open={modalOpen}
        onOpenChange={(nextOpen) => {
          setModalOpen(nextOpen);
          if (!nextOpen) setTrabajadorAEditar(null);
        }}
        trabajador={trabajadorAEditar}
      />

      <Modal
        open={Boolean(trabajadorAEliminar)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTrabajadorAEliminar(null);
        }}
        title="Eliminar trabajador"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTrabajadorAEliminar(null)}
              className="min-h-[40px] px-3 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarEliminar}
              isLoading={setActivo.isPending}
              className="min-h-[40px] border-danger bg-none bg-danger px-3 text-sm hover:bg-danger/90"
            >
              Sí, eliminar
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fdeeee] text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm text-ink">
            Se va a eliminar a <span className="font-semibold">{nombreAEliminar}</span>. Sus datos e historial
            quedan guardados en el sistema, pero dejará de aparecer como trabajador activo. ¿Deseas continuar?
          </p>
        </div>
      </Modal>
    </div>
  );
}
