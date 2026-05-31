import { useState } from "react";
import clsx from "clsx";
import styles from "./lightbox.module.css";

/**
 * Screenshots gallery with a click-to-zoom lightbox — the React replacement for
 * the legacy photoswipe/lity view. SSR-safe: thumbnails render on the server;
 * the overlay opens on click (client state). Receives image URLs as props.
 */
export default function Lightbox({ images }: { images: string[] }) {
  const [open, setOpen] = useState<number | null>(null);

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
            aria-label="Open screenshot"
          >
            <img className={styles.thumb} src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className={styles.overlay} role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" className={styles.close} onClick={() => setOpen(null)} aria-label="Close">
            ×
          </button>
          {open > 0 && (
            <button
              type="button"
              className={clsx(styles.nav, styles.prev)}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open - 1);
              }}
              aria-label="Previous"
            >
              ‹
            </button>
          )}
          <img
            className={styles.full}
            src={images[open]}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
          {open < images.length - 1 && (
            <button
              type="button"
              className={clsx(styles.nav, styles.next)}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open + 1);
              }}
              aria-label="Next"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
