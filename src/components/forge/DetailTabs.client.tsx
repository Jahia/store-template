import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import styles from "./detail-tabs.module.css";

interface TabDef {
  id: string;
  label: string;
}

interface DetailTabsProps {
  tabs: TabDef[];
  ariaLabel: string;
}

/**
 * Tab controller for the module detail page. The panels are server-rendered
 * siblings (each carrying `data-detail-panel="<id>"` + `role="tabpanel"`); this
 * island only renders the tablist and toggles panel visibility — the same
 * island-enhances-SSR pattern as StoreFilter. SSR renders every panel except the
 * first as `hidden`, so the active panel already matches on hydration (no flash)
 * and, with JS disabled, the first panel (Overview) is still readable.
 *
 * WAI-ARIA tabs: roving tabindex, arrows/Home/End move + select, each tab
 * `aria-controls` its panel and the panel is `aria-labelledby` its tab.
 */
export default function DetailTabs({ tabs, ariaLabel }: Readonly<DetailTabsProps>) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ready, setReady] = useState(false);

  // Show only the active panel. The panels live outside this island (SSR), so we
  // toggle their `hidden` attribute directly, exactly like StoreFilter does.
  useEffect(() => {
    const root = rootRef.current?.closest("[data-detail]");
    if (!root) return;
    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-detail-panel]"));
    for (const panel of panels) {
      panel.hidden = panel.dataset.detailPanel !== active;
    }
    setReady(true);
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    const id = tabs[next].id;
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  return (
    <div
      className={styles.tablist}
      role="tablist"
      aria-label={ariaLabel}
      ref={rootRef}
      data-detail-tabs-ready={ready ? "true" : undefined}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`detail-tab-${tab.id}`}
            aria-controls={`detail-panel-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={clsx(styles.tab, selected && styles.tabActive)}
            onClick={() => setActive(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
