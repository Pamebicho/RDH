import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CORPORATE_DOMAIN } from "@/config/env";
import type { Trabajador } from "@/types/database.types";
import * as api from "../api";
import {
  useActualizarTrabajador,
  useAreas,
  useAsignarRol,
  useCargos,
  useCrearTrabajador,
  useRevocarRol,
  useRolesCatalogo,
  useTrabajadorRoles,
} from "../hooks";

interface AddTrabajadorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trabajador?: Trabajador | null;
}

const initialForm = {
  rut: "",
  nombres: "",
  apellidos: "",
  correo: "",
  area: "",
  cargo: "",
  jefatura: "",
};

export function AddTrabajadorModal({ open, onOpenChange, trabajador = null }: AddTrabajadorModalProps) {
  const [form, setForm] = useState(initialForm);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const isEditing = Boolean(trabajador);

  const areasQuery = useAreas();
  const cargosQuery = useCargos();
  const areaPorId = new Map((areasQuery.data ?? []).map((area) => [area.id, area.nombre]));
  const cargoPorId = new Map((cargosQuery.data ?? []).map((cargo) => [cargo.id, cargo.nombre]));
  const rolesQuery = useRolesCatalogo();
  const rolesDelTrabajadorQuery = useTrabajadorRoles(trabajador?.id ?? null);
  const crearTrabajador = useCrearTrabajador();
  const actualizarTrabajador = useActualizarTrabajador(trabajador?.id ?? null);
  const asignarRol = useAsignarRol(trabajador?.id ?? null);
  const revocarRol = useRevocarRol(trabajador?.id ?? null);

  useEffect(() => {
    if (!open) return;
    if (!trabajador) {
      setForm(initialForm);
      setRolesSeleccionados(new Set());
      return;
    }
    setForm({
      rut: trabajador.rut ?? "",
      nombres: trabajador.nombres ?? "",
      apellidos: trabajador.apellidos ?? "",
      correo: trabajador.correo_corporativo,
      area: (trabajador.area_id ? areaPorId.get(trabajador.area_id) : "") ?? "",
      cargo: (trabajador.cargo_id ? cargoPorId.get(trabajador.cargo_id) : "") ?? "",
      jefatura: trabajador.jefatura ?? "",
    });
    setRolesSeleccionados(new Set((rolesDelTrabajadorQuery.data ?? []).map((tr) => tr.rol_id)));
    // Solo debe recargar cuando se abre el modal, cambia el trabajador a editar o llegan sus roles;
    // areaPorId/cargoPorId se derivan de los catálogos y no deben disparar otro reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trabajador, rolesDelTrabajadorQuery.data]);

  function toggleRol(rolId: string) {
    setRolesSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(rolId)) next.delete(rolId);
      else next.add(rolId);
      return next;
    });
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setForm(initialForm);
      setRolesSeleccionados(new Set());
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    setError(null);

    if (!form.rut.trim() || !form.nombres.trim() || !form.apellidos.trim() || !form.correo.trim()) {
      setError("RUT, nombres, apellidos y correo son obligatorios.");
      return;
    }

    if (!form.correo.trim().toLowerCase().endsWith(`@${CORPORATE_DOMAIN}`)) {
      setError(`El correo debe terminar en @${CORPORATE_DOMAIN}.`);
      return;
    }

    setGuardando(true);
    try {
      const [areaId, cargoId] = await Promise.all([
        form.area.trim() ? api.obtenerOCrearArea(form.area.trim()) : Promise.resolve(null),
        form.cargo.trim() ? api.obtenerOCrearCargo(form.cargo.trim()) : Promise.resolve(null),
      ]);

      const datos = {
        rut: form.rut.trim(),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        correo_corporativo: form.correo.trim().toLowerCase(),
        area_id: areaId,
        cargo_id: cargoId,
        jefatura: form.jefatura.trim() || null,
      };

      if (isEditing && trabajador) {
        actualizarTrabajador.mutate(datos, {
          onSuccess: () => {
            const rolesActivos = new Set((rolesDelTrabajadorQuery.data ?? []).map((tr) => tr.rol_id));
            for (const rol of rolesQuery.data ?? []) {
              const debeEstar = rolesSeleccionados.has(rol.id);
              const estaActivo = rolesActivos.has(rol.id);
              if (debeEstar && !estaActivo) asignarRol.mutate(rol.id);
              if (!debeEstar && estaActivo) revocarRol.mutate(rol.id);
            }
            handleClose(false);
          },
        });
        return;
      }

      crearTrabajador.mutate(
        { ...datos, rolIds: Array.from(rolesSeleccionados) },
        { onSuccess: () => handleClose(false) },
      );
    } catch {
      setError("No fue posible guardar el área o el cargo ingresado.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title={isEditing ? "Editar trabajador" : "Agregar trabajador"}
      description={
        isEditing
          ? "Actualiza los datos y roles del trabajador."
          : "Registra los datos del trabajador. Su acceso quedará habilitado cuando inicie sesión por primera vez con este correo."
      }
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleClose(false)} className="min-h-[40px] px-3 text-sm">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            isLoading={guardando || crearTrabajador.isPending || actualizarTrabajador.isPending}
            className="min-h-[40px] px-3 text-sm"
          >
            {isEditing ? "Guardar cambios" : "Agregar"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="nuevo-rut" className="mb-1 block text-xs font-medium text-[#51617a]">
            RUT
          </label>
          <input
            id="nuevo-rut"
            value={form.rut}
            onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))}
            placeholder="12.345.678-9"
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="nuevo-correo" className="mb-1 block text-xs font-medium text-[#51617a]">
            Correo de Krontec
          </label>
          <input
            id="nuevo-correo"
            type="email"
            value={form.correo}
            onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
            placeholder={`nombre@${CORPORATE_DOMAIN}`}
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="nuevo-nombres" className="mb-1 block text-xs font-medium text-[#51617a]">
            Nombres
          </label>
          <input
            id="nuevo-nombres"
            value={form.nombres}
            onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))}
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="nuevo-apellidos" className="mb-1 block text-xs font-medium text-[#51617a]">
            Apellidos
          </label>
          <input
            id="nuevo-apellidos"
            value={form.apellidos}
            onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="nuevo-area" className="mb-1 block text-xs font-medium text-[#51617a]">
            Área
          </label>
          <input
            id="nuevo-area"
            list="areas-existentes"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            placeholder="Escribe o elige un área…"
            className="form-input"
          />
          <datalist id="areas-existentes">
            {(areasQuery.data ?? []).map((area) => (
              <option key={area.id} value={area.nombre} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="nuevo-cargo" className="mb-1 block text-xs font-medium text-[#51617a]">
            Cargo
          </label>
          <input
            id="nuevo-cargo"
            list="cargos-existentes"
            value={form.cargo}
            onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            placeholder="Escribe o elige un cargo…"
            className="form-input"
          />
          <datalist id="cargos-existentes">
            {(cargosQuery.data ?? []).map((cargo) => (
              <option key={cargo.id} value={cargo.nombre} />
            ))}
          </datalist>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="nuevo-jefatura" className="mb-1 block text-xs font-medium text-[#51617a]">
            Jefatura
          </label>
          <input
            id="nuevo-jefatura"
            value={form.jefatura}
            onChange={(e) => setForm((f) => ({ ...f, jefatura: e.target.value }))}
            className="form-input"
          />
        </div>

        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-[#51617a]">Roles</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {(rolesQuery.data ?? []).map((rol) => (
              <label key={rol.id} className="flex items-center gap-1.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={rolesSeleccionados.has(rol.id)}
                  onChange={() => toggleRol(rol.id)}
                  className="h-4 w-4 rounded border-[#c4cddb] text-krontec-blue focus:ring-krontec-blue"
                />
                {rol.nombre}
              </label>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </Modal>
  );
}
