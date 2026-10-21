"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/busy";
import { BusyLabel } from "./ui";

/** Замена window.confirm(): нативный <dialog>, закрывается по Esc, фокус внутри окна. */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  cancelLabel = "Болдырмау",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Если вернёт промис — окно ждёт его с крутилкой на кнопке. */
  onConfirm: () => unknown;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => pending && e.preventDefault()}
      className="m-auto w-[min(92vw,24rem)] rounded-2xl border border-line bg-card p-6 text-text shadow-xl backdrop:bg-black/50"
    >
      <p className="mb-6 text-center font-serif text-lg">{title}</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await track(Promise.resolve(onConfirm()));
            } finally {
              setPending(false);
              onClose();
            }
          }}
          className="btn-primary"
        >
          {pending ? <BusyLabel>{confirmLabel}</BusyLabel> : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
