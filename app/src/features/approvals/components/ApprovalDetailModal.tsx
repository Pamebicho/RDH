import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { WeekTable } from "@/features/hours/components/WeekTable";
import { formatHours } from "@/features/hours/domain";
import { formatDateCl } from "@/utils/date";
import { usePlanillaDetalle, useAprobarPlanilla, useDevolverPlanilla, type PlanillaPendiente } from "../hooks";

interface ApprovalDetailModalProps {
  planilla: PlanillaPendiente | null;
  administradorId: string | undefined;
  onClose: () => void;
}

export function ApprovalDetailModal({ planilla, administradorId, onClose }: ApprovalDetailModalProps) {
  const [comentario, setComentario] = useState("");

  const detalle = usePlanillaDetalle(
    planilla?.id ?? null,
    planilla?.semanaFechaInicio,
    planilla?.semanaFechaFin,
  );
  const aprobar = useAprobarPlanilla(administradorId);
  const devolver = useDevolverPlanilla(administradorId);

  if (!planilla) return null;

  function handleAprobar() {
    if (!planilla) return;
    aprobar.mutate(planilla.id, { onSuccess: onClose });
  }

  function handleDevolver() {
    if (!planilla) return;
    if (!comentario.trim()) {
      return;
    }
    devolver.mutate({ planillaId: planilla.id, comentario: comentario.trim() }, { onSuccess: onClose });
  }

  return (
    <Modal
      open={Boolean(planilla)}
      onOpenChange={(open) => !open && onClose()}
      title={`${planilla.trabajadorNombre} — Semana ${planilla.semanaNumero}`}
      description={`${formatDateCl(planilla.semanaFechaInicio)} – ${formatDateCl(planilla.semanaFechaFin)} · ${planilla.periodoNombre}`}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline">
            Cerrar
          </button>
          <Button type="button" variant="outline" onClick={handleDevolver} isLoading={devolver.isPending}>
            Devolver
          </Button>
          <Button type="button" onClick={handleAprobar} isLoading={aprobar.isPending}>
            Aprobar
          </Button>
        </>
      }
    >
      {detalle.isLoading ? (
        <p className="text-sm text-ink-muted">Cargando detalle…</p>
      ) : (
        <div className="space-y-4">
          <WeekTable
            days={detalle.days}
            columns={detalle.columnas}
            hours={detalle.hours}
            activeDate={null}
            isSubmitted
            getDayTotal={detalle.getDayTotal}
            getColumnTotal={detalle.getColumnTotal}
            registeredHours={detalle.weekTotal}
            onSetHour={() => {}}
            onSetActiveDate={() => {}}
          />

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-control border border-border p-3">
              <span className="block text-xs text-ink-muted">Ordinarias</span>
              <strong>{formatHours(planilla.totalOrdinarias)}</strong>
            </div>
            <div className="rounded-control border border-border p-3">
              <span className="block text-xs text-ink-muted">Extraordinarias</span>
              <strong>{formatHours(planilla.totalExtraordinarias)}</strong>
            </div>
            <div className="rounded-control border border-border p-3">
              <span className="block text-xs text-ink-muted">Ausencias</span>
              <strong>{formatHours(planilla.totalAusencias)}</strong>
            </div>
          </div>

          <div>
            <label htmlFor="comentario-devolucion" className="mb-1.5 block text-sm font-semibold text-ink">
              Comentario (obligatorio para devolver)
            </label>
            <textarea
              id="comentario-devolucion"
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              rows={3}
              placeholder="Motivo de la devolución…"
              className="form-input"
            />
          </div>

          {detalle.historial.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Historial</h3>
              <ul className="space-y-1.5 text-sm text-ink-muted">
                {detalle.historial.map((entrada) => (
                  <li key={entrada.id}>
                    {entrada.accion} — {new Date(entrada.fecha_hora).toLocaleString("es-CL")}
                    {entrada.comentario ? `: ${entrada.comentario}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
