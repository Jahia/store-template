import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "./nav-progress.module.css";

/**
 * Global navigation-loading indicator for the storefront's server-side filtering.
 * Applying a status/category facet (the left rail), submitting the header keyword search,
 * or paging the results each triggers a full-page GET navigation — this island reveals a
 * top progress bar (and announces "Loading…") the moment one starts, so the wait for the
 * filtered page is visible. It listens on the document, so the rail form, the header search
 * form (present on every page) and the pagination links are all covered by one island, and
 * resets on `pageshow` so a bfcache back-navigation never restores it stuck "loading".
 * The bar is position:fixed, so its location in the DOM is irrelevant.
 */
export default function NavProgress() {
  const { t } = useTranslation();
  const barRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const live = liveRef.current;

    const show = () => {
      bar.dataset.loading = "true";
      if (live) live.textContent = t("chrome.search.loading");
    };
    const hide = () => {
      delete bar.dataset.loading;
      if (live) live.textContent = "";
    };

    const onSubmit = (e: Event) => {
      const form = e.target;
      if (
        form instanceof HTMLFormElement &&
        (form.matches("[data-forge-filter]") || form.matches("[role='search']"))
      ) {
        show();
      }
    };
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-forge-pagination] a")) show();
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    // Reset on initial load and on bfcache restore so a back-navigation never shows it stuck.
    globalThis.addEventListener("pageshow", hide);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      globalThis.removeEventListener("pageshow", hide);
    };
  }, [t]);

  return (
    <>
      <div ref={barRef} className={styles.bar} data-nav-progress="" aria-hidden="true" />
      <output ref={liveRef} className="sr-only" aria-live="polite" data-nav-status="" />
    </>
  );
}
