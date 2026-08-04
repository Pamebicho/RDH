import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import type { CostCenter } from "@/types/database.types";

interface CentersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allCenters: CostCenter[];
  selectedCenterIds: string[];
  onApply: (centerIds: string[]) => void;
  isApplying: boolean;
}

export function CentersModal({
  open,
  onOpenChange,
  allCenters,
  selectedCenterIds,
  onApply,
  isApplying,
}: CentersModalProps) {
  const [draftSelection, setDraftSelection] = useState<string[]>(selectedCenterIds);

  useEffect(() => {
    if (open) {
      setDraftSelection(selectedCenterIds);
    }
  }, [open, selectedCenterIds]);

  function toggleCenter(centerId: string) {
    setDraftSelection((current) =>
      current.includes(centerId) ? current.filter((id) => id !== centerId) : [...current, centerId],
    );
  }

  function handleApply() {
    if (!draftSelection.length) {
      toast.warning("Debes seleccionar al menos un centro de costo.");
      return;
    }

    onApply(draftSelection);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Centros de costo del período"
      description="Selecciona únicamente los centros en los que trabajaste durante el mes."
      size="lg"
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className="btn-outline">
            Cancelar
          </button>
          <Button type="button" onClick={handleApply} isLoading={isApplying}>
            Aplicar selección
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {allCenters.map((center) => {
          const checked = draftSelection.includes(center.id);

          const inputId = `center-${center.id}`;

          return (
            <label
              key={center.id}
              htmlFor={inputId}
              className={cn(
                "flex min-h-[78px] cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-all duration-fast",
                checked && "border-[#75a8eb] bg-[#f3f8ff]",
              )}
            >
              <input
                id={inputId}
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border text-krontec-blue focus:ring-krontec-blue"
                checked={checked}
                onChange={() => toggleCenter(center.id)}
              />
              <span>
                <strong className="block text-sm text-[#10203c]">{center.id}</strong>
                <small className="mt-0.5 block text-ink-muted">{center.name}</small>
              </span>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}
