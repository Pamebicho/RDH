import { Save, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PlanillaEstado } from "@/types/database.types";
import { formatHours, type TotalesPorCategoria } from "../domain";

interface WeekSummaryProps {
  estado: PlanillaEstado;
  expectedHours: number;
  registeredHours: number;
  remainingHours: number;
  totales: TotalesPorCategoria;
  isSubmitted: boolean;
  dirty: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  onSave: () => void;
  onSubmit: () => void;
}

export function WeekSummary({
  estado,
  expectedHours,
  registeredHours,
  remainingHours,
  totales,
  isSubmitted,
  dirty,
  isSaving,
  isSubmitting,
  onSave,
  onSubmit,
}: WeekSummaryProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e3e8f0] bg-[#fbfcfe] px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <StatusBadge status={estado} />

        <span className="text-ink-muted">
          Esperadas: <strong className="text-ink">{formatHours(expectedHours)}</strong>
        </span>
        <span className="text-ink-muted">
          Registradas: <strong className="text-success">{formatHours(registeredHours)}</strong>
        </span>
        <span className="text-ink-muted">
          Restantes: <strong className="text-[#b45300]">{formatHours(remainingHours)}</strong>
        </span>
        {totales.extraordinarias > 0 ? (
          <span className="text-ink-muted">
            Extra: <strong className="text-ink">{formatHours(totales.extraordinarias)}</strong>
          </span>
        ) : null}
        {totales.ausencias > 0 ? (
          <span className="text-ink-muted">
            Ausencias: <strong className="text-ink">{formatHours(totales.ausencias)}</strong>
          </span>
        ) : null}
        {dirty && !isSubmitted ? <span className="text-[#a54e00]">Cambios sin guardar</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          isLoading={isSaving}
          disabled={isSubmitted}
          className="min-h-[40px] px-3 text-sm"
        >
          <Save className="h-4 w-4" aria-hidden />
          Guardar
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          isLoading={isSubmitting}
          disabled={isSubmitted}
          className="min-h-[40px] px-3 text-sm"
        >
          <Send className="h-4 w-4" aria-hidden />
          Enviar semana
        </Button>
      </div>
    </div>
  );
}
