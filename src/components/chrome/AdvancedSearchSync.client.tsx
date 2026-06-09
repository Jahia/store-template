import { useEffect, useRef } from "react";

/**
 * Reconciles the cached header chrome with the live URL (it does NOT vary by query
 * string, so its server-rendered state freezes at the first render). On mount this
 * island reads window.location and:
 *   1. reflects ?src_terms / ?status / ?category into the advanced-search form's
 *      controls, so the panel matches the URL (and the storefront's left rail);
 *   2. appends the current query string to the language-switcher links, so switching
 *      language keeps the active filtering/search/page parameters.
 * Renders nothing.
 */
export default function AdvancedSearchSync() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);

    // 1. Advanced-search panel ← URL.
    const form = markerRef.current?.closest<HTMLFormElement>("[role='search']");
    if (form) {
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
    }

    // 2. Language switcher: carry the current query string onto each link so switching
    // language preserves the filter/search/page state. The base href (node URL in the
    // target language) has no query of its own, so replace any existing one.
    for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-lang-switch]")) {
      const base = (link.getAttribute("href") ?? "").split("?")[0];
      link.setAttribute("href", base + search);
    }
  }, []);

  return <span ref={markerRef} hidden data-advanced-search-sync="" />;
}
