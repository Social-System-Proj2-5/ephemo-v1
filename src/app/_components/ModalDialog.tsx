"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalDialogProps = {
  children: ReactNode;
  eyebrow: string;
  onClose: () => void;
  size?: "medium" | "large";
  title: string;
};

const sizeClasses = {
  medium: "max-w-3xl",
  large: "max-w-5xl",
};

export function ModalDialog({
  children,
  eyebrow,
  onClose,
  size = "medium",
  title,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      document.body.style.overflow = previousOverflow;

      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  function closeDialog() {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }

    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`m-auto max-h-[90dvh] w-[calc(100vw_-_2rem)] overflow-hidden rounded-lg border border-stone-300 bg-white p-0 text-stone-950 shadow-2xl backdrop:bg-black/50 ${sizeClasses[size]}`}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
    >
      <div className="bg-white">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-stone-200 px-5 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-700">{eyebrow}</p>
            <h2 id={titleId} className="truncate text-lg font-semibold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label={`${title}を閉じる`}
            autoFocus
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white text-2xl leading-none transition hover:bg-stone-100"
            onClick={closeDialog}
            title="閉じる"
          >
            ×
          </button>
        </header>

        <div className="max-h-[calc(90dvh_-_4rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </dialog>
  );
}
