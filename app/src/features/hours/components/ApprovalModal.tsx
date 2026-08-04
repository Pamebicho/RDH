import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatHours } from "../domain";

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingHours: number;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function ApprovalModal({
  open,
  onOpenChange,
  remainingHours,
  onConfirm,
  isSubmitting,
}: ApprovalModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Enviar registro para aprobación"
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className="btn-outline">
            Cancelar
          </button>
          <Button type="button" onClick={onConfirm} isLoading={isSubmitting}>
            Confirmar envío
          </Button>
        </>
      }
    >
      <p className="mb-2 text-sm text-ink">El período quedará bloqueado para edición después del envío.</p>
      {remainingHours > 0 ? (
        <div role="alert" className="rounded-control border border-[#f3d18a] bg-[#fff8ea] px-4 py-3 text-sm text-[#a54e00]">
          Aún quedan {formatHours(remainingHours)} horas por registrar. Puedes enviar el período, pero la
          jefatura verá esta diferencia.
        </div>
      ) : null}
    </Modal>
  );
}
