import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "./api";

function useCatalog<T>(key: string, queryFn: () => Promise<T[]>) {
  return useQuery({ queryKey: [key], queryFn });
}

export function useAreas() {
  return useCatalog("areas", api.fetchAreas);
}

export function useUpsertArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.upsertArea,
    onSuccess: () => {
      toast.success("Área guardada.");
      void queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
    onError: () => toast.error("No fue posible guardar el área."),
  });
}

export function useCargos() {
  return useCatalog("cargos", api.fetchCargos);
}

export function useUpsertCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.upsertCargo,
    onSuccess: () => {
      toast.success("Cargo guardado.");
      void queryClient.invalidateQueries({ queryKey: ["cargos"] });
    },
    onError: () => toast.error("No fue posible guardar el cargo."),
  });
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

export function useFeriados() {
  return useCatalog("feriados-admin", api.fetchFeriados);
}

export function useUpsertFeriado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.upsertFeriado,
    onSuccess: () => {
      toast.success("Feriado guardado.");
      void queryClient.invalidateQueries({ queryKey: ["feriados-admin"] });
    },
    onError: () => toast.error("No fue posible guardar el feriado."),
  });
}

export function useTiposRegistroAdmin() {
  return useCatalog("tipos-registro-admin", api.fetchTiposRegistro);
}

export function useUpsertTipoRegistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.upsertTipoRegistro,
    onSuccess: () => {
      toast.success("Tipo de registro guardado.");
      void queryClient.invalidateQueries({ queryKey: ["tipos-registro-admin"] });
      void queryClient.invalidateQueries({ queryKey: ["tipos-registro-activos"] });
    },
    onError: () => toast.error("No fue posible guardar el tipo de registro."),
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
    },
    onError: () => toast.error("No fue posible revocar el rol."),
  });
}

export function useAsignacionesDeProyecto(proyectoId: string | null) {
  return useQuery({
    queryKey: ["asignaciones-proyecto", proyectoId],
    queryFn: () => api.fetchAsignacionesDeProyecto(proyectoId as string),
    enabled: Boolean(proyectoId),
  });
}

export function useAsignarAdministrador(proyectoId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (administradorId: string) => api.asignarAdministrador(proyectoId as string, administradorId),
    onSuccess: () => {
      toast.success("Administrador asignado al proyecto.");
      void queryClient.invalidateQueries({ queryKey: ["asignaciones-proyecto", proyectoId] });
    },
    onError: () => toast.error("No fue posible asignar el administrador."),
  });
}

export function useRevocarAsignacion(proyectoId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asignacionId: string) => api.revocarAsignacion(asignacionId),
    onSuccess: () => {
      toast.success("Asignación revocada.");
      void queryClient.invalidateQueries({ queryKey: ["asignaciones-proyecto", proyectoId] });
    },
    onError: () => toast.error("No fue posible revocar la asignación."),
  });
}
