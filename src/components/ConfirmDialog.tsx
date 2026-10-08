"use client";

import { useEffect, useRef } from "react";
import { th } from "@/copy/th";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Native modal dialog: focus trap and Esc come from the platform. Cancel holds initial focus.
export function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-body" onCancel={onCancel}>
      <h2 id="dialog-title" className="h2">
        {title}
      </h2>
      <p id="dialog-body">{body}</p>
      <div className="actions">
        <button type="button" className="btn btn-secondary" autoFocus onClick={onCancel}>
          {th.history.cancel}
        </button>
        <button type="button" className="btn btn-danger" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
