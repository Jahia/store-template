import { useEffect, useRef, useState } from "react";
import styles from "./store-filter.module.css";

interface Labels {
  search: string;
  placeholder: string;
  status: string;
  categories: string;
  unit: string;
  none: string;
}

interface StoreFilterProps {
  statuses: string[];
  categories: string[];
  labels: Labels;
}

/** Parse a comma list from a URL param into a Set of allowed values. */
function paramSet(raw: string | null, allowed: string[]): Set<string> {
  if (!raw) return new Set();
  const allow = new Set(allowed);
  return new Set(raw.split(",").filter((v) => allow.has(v)));
}

/**
 * Storefront sidebar filter - the store.jahia.com layout: a left rail of
 * Categories and Status facets (multi-select) plus a text search, filtering the
 * SSR'd module cards instantly. The cards are static server-rendered HTML
 * carrying `data-forge-card` / `data-status` / `data-title` / `data-categories`;
 * this island (the first child of `[data-forge-list]`, sibling to the grid)
 * toggles their visibility and mirrors the filters in the URL (`src_terms`,
 * `status`, `category`) so the view is shareable and seeds from the header search.
 *
 * SSR-safe: initial state is constant (empty) so server and client render
 * identically; the URL is read in an effect after mount (no hydration mismatch).
 */
export default function StoreFilter({ statuses, categories, labels }: Readonly<StoreFilterProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  const [search, setSearch] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState<number | null>(null);

  // Seed from the URL once on the client (header search / shared links).
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const q = params.get("src_terms") || "";
    if (q) setSearch(q);
    setActiveStatuses(paramSet(params.get("status"), statuses));
    setActiveCategories(paramSet(params.get("category"), categories));
  }, [statuses, categories]);

  // Apply the filters to the SSR'd cards, and reflect them in the URL.
  useEffect(() => {
    const container = rootRef.current?.closest("[data-forge-list]");
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-forge-card]"));
    const term = search.trim().toLowerCase();
    let shown = 0;
    for (const card of cards) {
      const title = card.dataset.title || "";
      const cardStatus = card.dataset.status || "";
      const cardCategories = (card.dataset.categories || "").split("|").filter(Boolean);
      const matchTerm = term === "" || title.includes(term);
      const matchStatus = activeStatuses.size === 0 || activeStatuses.has(cardStatus);
      const matchCategory =
        activeCategories.size === 0 || cardCategories.some((c) => activeCategories.has(c));
      const match = matchTerm && matchStatus && matchCategory;
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
    setOrDelete(next, "status", activeStatuses);
    setOrDelete(next, "category", activeCategories);
    const qs = next.toString();
    const query = qs ? `?${qs}` : "";
    globalThis.history.replaceState(
      null,
      "",
      `${globalThis.location.pathname}${query}${globalThis.location.hash}`,
    );
  }, [search, activeStatuses, activeCategories]);

  const toggle = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    // A plain <div> (not <aside>): a complementary landmark nested inside <main>
    // trips axe's landmark-complementary-is-top-level best-practice rule.
    <div
      className={styles.sidebar}
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

      {categories.length > 0 && (
        <fieldset className={styles.facets}>
          <legend className={styles.legend}>{labels.categories}</legend>
          {categories.map((c) => (
            <label key={c} className={styles.facet}>
              <input
                type="checkbox"
                checked={activeCategories.has(c)}
                onChange={() => setActiveCategories((s) => toggle(s, c))}
              />
              <span>{c}</span>
            </label>
          ))}
        </fieldset>
      )}

      {statuses.length > 0 && (
        <fieldset className={styles.facets}>
          <legend className={styles.legend}>{labels.status}</legend>
          {statuses.map((s) => (
            <label key={s} className={styles.facet}>
              <input
                type="checkbox"
                checked={activeStatuses.has(s)}
                onChange={() => setActiveStatuses((set) => toggle(set, s))}
              />
              <span className={styles.facetStatus}>{s}</span>
            </label>
          ))}
        </fieldset>
      )}

      {visible !== null && (
        <p className={styles.count}>
          {visible} {labels.unit}
        </p>
      )}
      {visible === 0 && <p className={styles.none}>{labels.none}</p>}
    </div>
  );
}

/** Write a comma-joined facet selection to the URL params, or remove it if empty. */
function setOrDelete(params: URLSearchParams, key: string, values: Set<string>): void {
  if (values.size === 0) params.delete(key);
  else params.set(key, [...values].join(","));
}
