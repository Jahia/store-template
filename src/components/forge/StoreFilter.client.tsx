import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import styles from "./store-filter.module.css";

interface Labels {
  search: string;
  placeholder: string;
  status: string;
  all: string;
  unit: string;
  none: string;
}

interface StoreFilterProps {
  statuses: string[];
  labels: Labels;
}

const ALL = "__all__";

/**
 * Instant client-side filter over the SSR'd module cards — the React
 * replacement for the legacy isotope/select2 filter. The cards are static
 * server-rendered HTML carrying `data-forge-card` / `data-status` /
 * `data-title`; this island (a sibling inside the same `[data-forge-list]`
 * container) toggles their visibility and mirrors the filter in the URL
 * (`src_terms`, `status`) so it's shareable and seeds from the header search.
 *
 * SSR-safe: initial state is constant (empty / All) so server and client render
 * identically; the URL is read in an effect after mount (no hydration mismatch,
 * no `window` access during render).
 */
export default function StoreFilter({ statuses, labels }: Readonly<StoreFilterProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [visible, setVisible] = useState<number | null>(null);

  // Seed from the URL once on the client (header search / shared links).
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const q = params.get("src_terms") || "";
    const s = params.get("status");
    if (q) setSearch(q);
    if (s && statuses.includes(s)) setStatus(s);
  }, [statuses]);

  // Apply the filter to the SSR'd cards, and reflect it in the URL.
  useEffect(() => {
    const container = rootRef.current?.closest("[data-forge-list]");
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-forge-card]"));
    const term = search.trim().toLowerCase();
    let shown = 0;
    for (const card of cards) {
      const title = card.dataset.title || "";
      const cardStatus = card.dataset.status || "";
      const match = (term === "" || title.includes(term)) && (status === ALL || cardStatus === status);
      card.hidden = !match;
      if (match) shown++;
    }
    setVisible(shown);

    // Skip the very first run so a header-seeded ?src_terms isn't cleared before
    // the seed effect's state update lands.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const next = new URLSearchParams(globalThis.location.search);
    if (term) next.set("src_terms", term);
    else next.delete("src_terms");
    next.delete("q");
    if (status === ALL) next.delete("status");
    else next.set("status", status);
    const qs = next.toString();
    const query = qs ? `?${qs}` : "";
    globalThis.history.replaceState(null, "", `${globalThis.location.pathname}${query}${globalThis.location.hash}`);
  }, [search, status]);

  return (
    <div
      className={styles.filter}
      ref={rootRef}
      data-filter-ready={visible === null ? undefined : "true"}
    >
      <input
        className={styles.search}
        type="search"
        value={search}
        placeholder={labels.placeholder}
        aria-label={labels.search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {statuses.length > 0 && (
        <fieldset className={styles.facets} aria-label={labels.status}>
          <button
            type="button"
            className={clsx(styles.facet, status === ALL && styles.facetActive)}
            onClick={() => setStatus(ALL)}
          >
            {labels.all}
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              className={clsx(styles.facet, status === s && styles.facetActive)}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </fieldset>
      )}
      {visible !== null && (
        <span className={styles.count}>
          {visible} {labels.unit}
        </span>
      )}
      {visible === 0 && <p className={styles.none}>{labels.none}</p>}
    </div>
  );
}
