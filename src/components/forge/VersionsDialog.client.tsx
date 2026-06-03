import { useEffect, useRef } from "react";

interface VersionsDialogProps {
  /** Trigger button label (e.g. "Versions (3)"), computed server-side. */
  buttonLabel: string;
}

/**
 * Trigger for the "Versions" popup. The dialog itself — the version list and the
 * owner upload-new-version form — is server-rendered as a sibling
 * `<dialog data-versions-dialog>` inside the detail article (its contents include
 * Jahia `<Render>` views + nested islands, which only SSR can produce). This island
 * just opens it via the native `showModal()`, which gives a focus trap, Escape-to-
 * close and an inert backdrop for free; the dialog's own `<form method="dialog">`
 * close button handles closing, and we add backdrop-click-to-close.
 *
 * Islands never import react-i18next — the label is passed in as a prop.
 */
export default function VersionsDialog({ buttonLabel }: Readonly<VersionsDialogProps>): JSX.Element {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const root = buttonRef.current?.closest("[data-detail]");
    const dialog = root?.querySelector<HTMLDialogElement>("[data-versions-dialog]") ?? null;
    dialogRef.current = dialog;
    if (!dialog) return;
    // Close when the click lands on the dialog element itself (the backdrop area),
    // not on its content. Escape + the close button are handled natively.
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  const open = () => {
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className="store-btn store-btn--ghost"
      onClick={open}
      data-versions-open=""
    >
      {buttonLabel}
    </button>
  );
}
