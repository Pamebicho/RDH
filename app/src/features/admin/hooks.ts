import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "./api";

function useCatalog<T>(key: string, queryFn: () => Promise<T[]>) {
  return useQuery({ queryKey: [key], queryFn });
}

export function useAreas() {
  return useCatalog("areas", api.fetchAreas);
}

export function useCargos() {
  return useCatalog("cargos", api.fetchCargos);
}

export function useAdminProyectos() {
  return useCatalog("admin-proyectos", api.fetchProyectos);
}

export function useUpsertProyecto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.upsertProyecto,
    onSuccess: () => {
      toast.success("Proyecto guardado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-proyectos"] });
      void queryClient.invalidateQueries({ queryKey: ["proyectos-activos"] });
    },
    onError: () => toast.error("No fue posible guardar el proyecto."),
  });
}

export function useJornadas() {
  return useCatalog("jornadas-admin", api.fetchJornadas);
}

export function useJornadaDias(jornadaId: string | null) {
  return useQuery({
    queryKey: ["jornada-dias", jornadaId],
    queryFn: () => api.fetchJornadaDias(jornadaId as string),
    enabled: Boolean(jornadaId),
  });
}

export function useUpsertJornadaDia(jornadaId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.upsertJornadaDia,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jornada-dias", jornadaId] });
    },
    onError: () => toast.error("No fue posible actualizar las horas esperadas."),
  });
}

export function useTrabajadoresAdmin() {
  return useCatalog("trabajadores-admin", api.fetchTrabajadores);
}

export function useRolesCatalogo() {
  return useCatalog("roles-catalogo", api.fetchRoles);
}

export function useCrearTrabajador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.crearTrabajador,
    onSuccess: () => {
      toast.success("Trabajador agregado.");
      void queryClient.invalidateQueries({ queryKey: ["trabajadores-admin"] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && error.message.includes("duplicate")
          ? "Ya existe un trabajador con ese correo o RUT."
          : "No fue posible agregar el trabajador.";
      toast.error(message);
    },
  });
}

export function useActualizarTrabajador(trabajadorId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: api.DatosTrabajador) => api.actualizarTrabajador(trabajadorId as string, datos),
    onSuccess: () => {
      toast.success("Datos del trabajador actualizados.");
      void queryClient.invalidateQueries({ queryKey: ["trabajadores-admin"] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && error.message.includes("duplicate")
          ? "Ya existe otro trabajador con ese correo o RUT."
          : "No fue posible actualizar los datos.";
      toast.error(message);
    },
  });
}

export function useSetTrabajadorActivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => api.setTrabajadorActivo(id, activo),
    onSuccess: (_data, { activo }) => {
      toast.success(activo ? "Trabajador reactivado." : "Trabajador eliminado (queda inactivo en el sistema).");
      void queryClient.invalidateQueries({ queryKey: ["trabajadores-admin"] });
    },
    onError: () => toast.error("No fue posible cambiar el estado del trabajador."),
  });
}

export function useTodosTrabajadorRoles() {
  return useCatalog("trabajador-roles-todos", api.fetchTodosTrabajadorRoles);
}

export function useTrabajadorRoles(trabajadorId: string | null) {
  return useQuery({
    queryKey: ["trabajador-roles", trabajadorId],
    queryFn: () => api.fetchTrabajadorRoles(trabajadorId as string),
    enabled: Boolean(trabajadorId),
  });
}

export function useAsignarRol(trabajadorId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rolId: string) => api.asignarRol(trabajadorId as string, rolId),
    onSuccess: () => {
      toast.success("Rol asignado.");
      void queryClient.invalidateQueries({ queryKey: ["trabajador-roles", trabajadorId] });
      void queryClient.invalidateQueries({ queryKey: ["trabajador-roles-todos"] });
    },
    onError: () => toast.error("No fue posible asignar el rol."),
  });
}

export function useRevocarRol(trabajadorId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rolId: string) => api.revocarRol(trabajadorId as string, rolId),
    onSuccess: () => {
      toast.success("Rol revocado.");
      void queryClient.invalidateQueries({ queryKey: ["trabajador-roles", trabajadorId] });
      void queryClient.invalidateQueries({ queryKey: ["trabajador-roles-todos"] });
    },
    onError: () => toast.error("No fue posible revocar el rol."),
  });
}
