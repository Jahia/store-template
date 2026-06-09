import { useEffect, useRef } from "react";

/**
 * Progressive enhancement for the storefront facet form (same island-enhances-SSR
 * pattern as DetailTabs). The facets live in a plain server-rendered
 * `<form data-forge-filter method="get">` so they work without JS and the state
 * stays URL-shareable. Once this island hydrates it removes the need to click
 * "Apply": toggling any facet submits the form. It renders nothing visible — it
 * finds its enclosing form, flags it `data-filter-ready` (so the no-JS fallback
 * submit button hides via CSS) and submits on `change`.
 */
export default function FilterAutoSubmit() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = markerRef.current?.closest<HTMLFormElement>("[data-forge-filter]");
    if (!form) return;
    // Flag the form so the fallback "Apply" button can hide itself via CSS.
    form.dataset.filterReady = "true";

    const submit = () => {
      // `requestSubmit` runs validation + fires the submit event; fall back to the
      // older `submit` on the off chance it is unavailable.
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.submit();
    };
    form.addEventListener("change", submit);
    return () => form.removeEventListener("change", submit);
  }, []);

  return <span ref={markerRef} hidden data-filter-autosubmit="" />;
}
