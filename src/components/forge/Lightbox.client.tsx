import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./lightbox.module.css";

export interface LightboxLabels {
  open: string;
  close: string;
  previous: string;
  next: string;
}

/**
 * Screenshots gallery with a click-to-zoom lightbox - the React replacement for
 * the legacy photoswipe/lity view. SSR-safe: thumbnails render on the server;
 * the overlay opens on click (client state). Receives image URLs + translated
 * control labels as props (the island never imports i18next).
 */
export default function Lightbox({
  images,
  labels,
}: Readonly<{ images: string[]; labels: LightboxLabels }>) {
  const [open, setOpen] = useState<number | null>(null);

  // While the viewer is open, ← / → step through images (clamped at the ends) and
  // Escape closes it. A document listener works regardless of which control has
  // focus; functional updates keep it correct without re-binding on every step.
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
            aria-label={labels.open}
          >
            <img className={styles.thumb} src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className={styles.overlay} data-lightbox="">

          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setOpen(null)}
            aria-label={labels.close}
          />
          <button type="button" className={styles.close} onClick={() => setOpen(null)} aria-label={labels.close}>
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
        </div>
      )}
    </>
  );
}
