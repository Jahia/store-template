import { useEffect, useRef, useState } from "react";
import styles from "./mobile-nav.module.css";

interface NavLink {
  /** Stable key + href for the page link. */
  href: string;
  label: string;
}

interface MobileNavLabels {
  /** aria-label for the trigger when the panel is closed (also names the nav). */
  open: string;
  /** aria-label for the trigger when the panel is open. */
  close: string;
  /** aria-label for the nav landmark inside the panel. */
  nav: string;
  /** Placeholder for the search input. */
  searchPlaceholder: string;
  /** aria-label for the search input/landmark. */
  searchLabel: string;
}

interface MobileNavProps {
  links: NavLink[];
  /** GET action URL for the search form (the storefront home). */
  searchAction: string;
  labels: MobileNavLabels;
}

/**
 * Disclosure that surfaces the primary nav + search on narrow viewports, where
 * the desktop `.nav`/`.search` are hidden (≤720px). A hamburger button toggles a
 * panel containing the same nav links and a search field; the desktop markup is
 * untouched. The whole island is hidden ≥721px via the CSS module, so it never
 * duplicates the desktop chrome on wide screens.
 *
 * Accessible disclosure: the button carries aria-expanded + aria-controls; Escape
 * closes the panel and returns focus to the button; opening moves focus to the
 * first interactive element so keyboard users land inside the panel.
 */
export default function MobileNav({ links, searchAction, labels }: Readonly<MobileNavProps>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Hydration-ready signal so the (SSR-hidden) toggle is only interactive client-side.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // Escape closes and returns focus to the trigger (disclosure semantics).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // On open, move focus into the panel (first link, else the search field).
  useEffect(() => {
    if (!open) return;
    if (firstLinkRef.current) firstLinkRef.current.focus();
    else searchRef.current?.focus();
  }, [open]);

  return (
    <div className={styles.mobileNav} data-mobile-nav-ready={ready ? "true" : undefined}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? labels.close : labels.open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.bars} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <div
        id="mobile-nav-panel"
        ref={panelRef}
        className={styles.panel}
        hidden={!open}
      >
        {links.length > 0 && (
          <nav className={styles.nav} aria-label={labels.nav}>
            {links.map((link, i) => (
              <a
                key={link.href}
                ref={i === 0 ? firstLinkRef : undefined}
                className={styles.navLink}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
        <form className={styles.search} method="get" action={searchAction} role="search">
          <input
            ref={searchRef}
            className={styles.searchInput}
            type="search"
            name="src_terms"
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchLabel}
          />
        </form>
      </div>
    </div>
  );
}
