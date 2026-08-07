import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarDays, ChevronDown, FileSpreadsheet, Grid3x3 } from "lucide-react";
import { cn } from "@/utils/cn";
import type { Periodo } from "@/types/database.types";

interface PeriodSelectorProps {
  periodoId: string;
  onPeriodoChange: (periodoId: string) => void;
  periodos: Periodo[];
  onManageProjects: () => void;
  onExportPeriodo: () => void;
  isExporting: boolean;
}

export function PeriodSelector({
  periodoId,
  onPeriodoChange,
  periodos,
  onManageProjects,
  onExportPeriodo,
  isExporting,
}: PeriodSelectorProps) {
  const periodoActual = periodos.find((periodo) => periodo.id === periodoId);

  return (
    <section aria-label="Configuración del período" className="mb-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="btn-outline w-full min-h-[40px] justify-center px-3 text-sm sm:w-auto sm:max-w-[240px]"
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-[#0764e1]" aria-hidden />
              <span className="truncate">{periodoActual?.nombre ?? "Selecciona un período"}</span>
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={8}
              className="z-[1030] max-h-72 min-w-[220px] overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-[0_1rem_3rem_rgba(15,31,59,0.18)]"
            >
              {periodos.map((periodo) => (
                <DropdownMenu.Item
                  key={periodo.id}
                  onSelect={() => onPeriodoChange(periodo.id)}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-bg",
                    periodo.id === periodoId ? "font-semibold text-krontec-blue" : "text-ink",
                  )}
                >
                  {periodo.nombre}
                </DropdownMenu.Item>
              ))}
              {!periodos.length ? (
                <p className="px-3 py-2.5 text-sm text-ink-muted">No hay períodos disponibles.</p>
              ) : null}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          type="button"
          onClick={onManageProjects}
          className="btn-outline w-full min-h-[40px] justify-center px-3 text-sm sm:w-auto"
        >
          <Grid3x3 className="h-4 w-4 shrink-0" aria-hidden />
          <span>Centros de costo</span>
        </button>
        <button
          type="button"
          onClick={onExportPeriodo}
          disabled={isExporting}
          className="btn-outline w-full min-h-[40px] justify-center px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <span>{isExporting ? "Exportando…" : "Exportar período"}</span>
        </button>
      </div>
    </section>
  );
}
