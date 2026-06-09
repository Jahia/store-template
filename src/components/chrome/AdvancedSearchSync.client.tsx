import { useEffect, useRef } from "react";

/**
 * Reconciles the cached header chrome with the live URL (it does NOT vary by query
 * string, so its server-rendered state freezes at the first render). On mount this
 * island reads the location and:
 *   1. reflects ?src_terms into the header search input, so it matches the URL when
 *      already on a filtered results page (status/category faceting lives in the
 *      modules-list left rail, which renders fresh, not in the cached header);
 *   2. carries the current filter/search query onto the language-switcher links
 *      (minus `page`, since switching language starts a fresh context) so switching
 *      language keeps the active filtering/search state;
 *   3. wires the header's <details> disclosures (account menu, language switcher)
 *      for keyboard/pointer dismissal: Escape closes the open one and returns focus
 *      to its <summary>, an outside click closes it, and any disclosure restored
 *      open by bfcache on back-navigation is collapsed so it can't cover the header.
 * Renders nothing.
 */
export default function AdvancedSearchSync() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const search = globalThis.location.search;
    const params = new URLSearchParams(search);

    // 1. Header search input ← URL.
    const form = markerRef.current?.closest<HTMLFormElement>("[role='search']");
    if (form) {
      const termInput = form.querySelector<HTMLInputElement>("input[name='src_terms']");
      if (termInput) termInput.value = params.get("src_terms") ?? "";
    }

    // 2. Language switcher: carry the current filter/search query onto each link so
    // switching language preserves it. Drop `page` — the other-language catalogue may
    // have fewer pages, so a new language starts on page 1. The base href (the node URL
    // in the target language) has no query of its own. URLSearchParams ignores any
    // fragment, so a crafted `#…` can never reach the rewritten href.
    const langParams = new URLSearchParams(search);
    langParams.delete("page");
    const langQuery = langParams.toString();
    for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-lang-switch]")) {
      const base = (link.getAttribute("href") ?? "").split("?")[0];
      link.setAttribute("href", langQuery ? `${base}?${langQuery}` : base);
    }

    // 3. Header <details> disclosures: dismissal + focus management. The native
    // element is keyboard-openable but has no close-on-Escape / close-on-outside-click
    // and bfcache can restore it open on back-navigation — handle all three here.
    const header = markerRef.current?.closest("header");
    const disclosures = Array.from(header?.querySelectorAll<HTMLDetailsElement>("details") ?? []);

    const closeOpen = (returnFocus: boolean) => {
      for (const d of disclosures) {
        if (!d.open) continue;
        d.open = false;
        if (returnFocus) d.querySelector<HTMLElement>("summary")?.focus();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOpen(true);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      for (const d of disclosures) {
        if (d.open && !d.contains(target)) d.open = false;
      }
    };
    // Collapse any disclosure that bfcache restored open on back-navigation so it can't cover the
    // header. The signal is `pageshow` with persisted=true — NOT mount: useEffect does not re-run
    // on bfcache restore (the tree stays mounted), and a blanket mount collapse would instead race
    // with — and slam shut — a menu the user (or a test) just opened before this island hydrated.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) for (const d of disclosures) d.open = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    globalThis.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      globalThis.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return <span ref={markerRef} hidden data-advanced-search-sync="" />;
}
