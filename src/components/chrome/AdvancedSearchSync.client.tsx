import { useEffect, useRef } from "react";

/**
 * Keeps the header advanced-search panel in sync with the active filters.
 *
 * The header is cached chrome — it does NOT vary by query string — so its
 * server-rendered defaultValue/defaultChecked freeze at the first render and drift
 * out of sync with the storefront's left filter rail (which renders fresh per
 * request). This island reads window.location on mount and reflects ?src_terms /
 * ?status / ?category into the enclosing search form's controls, so the panel
 * always matches the URL (and the left rail). Renders nothing.
 */
export default function AdvancedSearchSync() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = markerRef.current?.closest<HTMLFormElement>("[role='search']");
    if (!form) return;
    const params = new URLSearchParams(window.location.search);

    const termInput = form.querySelector<HTMLInputElement>("input[name='src_terms']");
    if (termInput) termInput.value = params.get("src_terms") ?? "";

    const checkFromParam = (name: string) => {
      const selected = new Set(params.getAll(name));
      for (const box of form.querySelectorAll<HTMLInputElement>(`input[name='${name}']`)) {
        box.checked = selected.has(box.value);
      }
    };
    checkFromParam("status");
    checkFromParam("category");
  }, []);

  return <span ref={markerRef} hidden data-advanced-search-sync="" />;
}
