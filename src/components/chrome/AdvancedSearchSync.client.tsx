import { useEffect, useRef } from "react";

/**
 * Reconciles the cached header chrome with the live URL (it does NOT vary by query
 * string, so its server-rendered state freezes at the first render). On mount this
 * island reads the location and:
 *   1. reflects ?src_terms into the header search input AND injects the active
 *      ?status / ?category as hidden inputs on the search form, so submitting a
 *      keyword keeps the facet selection (the facet controls live in the modules-list
 *      left rail, which renders fresh, not in the cached header);
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

    // 1. Header search input ← URL, and carry the active facets onto the search form so submitting
    // a keyword keeps the status/category selection (the GET form only submits its own fields, and
    // the facet controls live in the modules-list left rail, not here). The header is cached chrome
    // that does NOT vary by query string, so these must be injected client-side from the live URL
    // rather than server-rendered (SSR values would freeze and leak the first visitor's filters).
    const form = markerRef.current?.closest<HTMLFormElement>("[role='search']");
    const termInput = form?.querySelector<HTMLInputElement>("input[name='src_terms']") ?? null;
    if (form) {
      if (termInput) termInput.value = params.get("src_terms") ?? "";

      // Drop any facet hidden inputs a previous run injected before re-adding them, so a bfcache
      // restore or a re-mount can't leave stale status/category values on the form that would be
      // submitted alongside the current ones (SECURITY-571 blind review).
      for (const stale of form.querySelectorAll<HTMLInputElement>(
        "input[type='hidden'][name='status'], input[type='hidden'][name='category']",
      )) {
        stale.remove();
      }

      for (const name of ["status", "category"]) {
        for (const value of params.getAll(name)) {
          const hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = name;
          hidden.value = value;
          form.appendChild(hidden);
        }
      }
    }

    // 1b. Clearing the search re-applies. The native `type=search` "×" button empties the field
    // but does NOT submit, so the listing would keep showing the old keyword filter until the user
    // pressed Enter. The `search` event fires on that clear gesture (the "×" and Escape) AND on
    // Enter — and is emitted by Chrome, Firefox, Safari and Edge for the native clear button — so
    // we submit the header form on it. The form now carries the active facets as hidden inputs, so
    // the keyword is dropped immediately while the status/category selection is kept.
    // Gate on a non-empty `src_terms` in the URL so this fires only on a genuine clear of an active
    // search — never on an already-empty field (no double-submit with the browser's Enter submit).
    // A non-empty value (Enter on a typed term) is left to that native submit.
    const onSearch = () => {
      if (
        form &&
        termInput &&
        !termInput.value.trim() &&
        (params.get("src_terms") ?? "").trim()
      ) {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
      }
    };
    termInput?.addEventListener("search", onSearch);

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

    // 3a. Mirror each <details> open-state onto its <summary> as aria-expanded. Native
    // <details>/<summary> exposes open/closed through the `open` attribute, but Safari/VoiceOver
    // does not reliably announce it; an explicit aria-expanded fixes that (WCAG 4.1.2, blind
    // review). The `toggle` event fires for user clicks AND for the programmatic open changes made
    // by the dismissal handlers below, so a single listener keeps it in sync everywhere.
    const expandedSyncs = disclosures.map((d) => {
      const summary = d.querySelector<HTMLElement>("summary");
      const sync = () => summary?.setAttribute("aria-expanded", String(d.open));
      sync();
      d.addEventListener("toggle", sync);
      return { d, sync };
    });

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
      termInput?.removeEventListener("search", onSearch);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      globalThis.removeEventListener("pageshow", onPageShow);
      for (const { d, sync } of expandedSyncs) d.removeEventListener("toggle", sync);
    };
  }, []);

  return <span ref={markerRef} hidden data-advanced-search-sync="" />;
}
