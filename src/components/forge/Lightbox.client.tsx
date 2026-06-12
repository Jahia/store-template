import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import styles from "./lightbox.module.css";

export interface LightboxLabels {
  open: string;
  close: string;
  previous: string;
  next: string;
}

/**
 * Screenshots gallery with a click-to-zoom viewer. SSR-safe: thumbnails render on the server;
 * the overlay is a native <dialog> opened with showModal() — which gives a real modal (focus
 * trap, inert background, Escape-to-close, and focus restored to the trigger on close) for free.
 * ←/→ page through the images; Escape (native) closes. Receives image URLs + translated control
 * labels as props (the island never imports i18next).
 */
export default function Lightbox({
  images,
  labels,
}: Readonly<{ images: string[]; labels: LightboxLabels }>) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Drive the native dialog from `open`. showModal() saves the active element (the clicked
  // thumbnail) and restores focus to it on close, so no manual focus management is needed.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) {
      dialog.showModal();
    } else if (open === null && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // ←/→ navigation + Escape while open. The native <dialog> also closes on Escape, but only when
  // the event reaches it; handling Escape here as well makes close deterministic regardless of
  // where focus sits. Functional updates keep navigation clamped without re-binding each step.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setOpen((i) => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setOpen((i) => (i !== null && i < images.length - 1 ? i + 1 : i));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <div className={styles.thumbs}>
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            className={styles.thumbBtn}
            onClick={() => setOpen(i)}
            // Unique, descriptive name per thumbnail (WCAG 2.4.6): "<open> 1", "<open> 2"…
            aria-label={`${labels.open} ${i + 1}`}
          >
            <img className={styles.thumb} src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={labels.open}
        onClose={() => setOpen(null)}
      >
        {open !== null && (
          <div className={styles.dialogInner} data-lightbox="">
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(null)}
              aria-label={labels.close}
            >
              ×
            </button>
            {open > 0 && (
              <button
                type="button"
                className={clsx(styles.nav, styles.prev)}
                onClick={() => setOpen(open - 1)}
                aria-label={labels.previous}
              >
                ‹
              </button>
            )}
            <img className={styles.full} src={images[open]} alt="" data-lightbox-image="" />
            {open < images.length - 1 && (
              <button
                type="button"
                className={clsx(styles.nav, styles.next)}
                onClick={() => setOpen(open + 1)}
                aria-label={labels.next}
              >
                ›
              </button>
            )}
            <output className="sr-only" aria-live="polite">
              {`${open + 1} / ${images.length}`}
            </output>
          </div>
        )}
      </dialog>
    </>
  );
}
