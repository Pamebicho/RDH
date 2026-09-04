import { useQuery } from "@tanstack/react-query";
import { fetchDevolucionesPendientes } from "./api";

export function useDevolucionesPendientes(trabajadorId: string | undefined) {
  return useQuery({
    queryKey: ["devoluciones-pendientes", trabajadorId],
    queryFn: () => fetchDevolucionesPendientes(trabajadorId as string),
    enabled: Boolean(trabajadorId),
    staleTime: 30_000,
  });
}
