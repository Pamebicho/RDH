import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export function Modal({ open, onOpenChange, title, description, children, footer, size = "md" }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1040] bg-[#0b1a33]/55" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-[1050] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border-0 bg-white shadow-[0_1.5rem_4rem_rgba(15,31,59,0.18)] focus:outline-none ${
            size === "lg" ? "max-w-2xl" : "max-w-md"
          }`}
        >
          <header className="flex items-start justify-between gap-4 border-b border-[#e7ecf3] px-4 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Cerrar"
              className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-bg hover:text-ink"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </header>

          <div className="max-h-[70vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>

          {footer ? (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-[#e7ecf3] px-4 py-4 sm:gap-3 sm:px-6">
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
