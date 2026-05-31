import { useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import clsx from "clsx";
import styles from "./admin.module.css";
import { getAdminI18n } from "./i18n";
import { ForgeSettings } from "./ForgeSettings";
import { CategorySettings } from "./CategorySettings";
import { ManageRoles } from "./ManageRoles";

type Tab = "forgeSettings" | "categorySettings" | "manageRoles";

export interface AdminAppProps {
  siteKey: string;
  initialTab?: Tab;
  language?: string;
}

/**
 * Tabbed admin shell — the in-site replacement for the legacy Spring Web Flow
 * Settings / Categories / Roles tabs. Each tab renders a ported screen; all
 * fetch from /modules/graphql (see gql.ts). One hydration island.
 */
function AdminTabs({ siteKey, initialTab = "forgeSettings" }: { siteKey: string; initialTab?: Tab }) {
  const { t } = useTranslation("privateappstore");
  const [tab, setTab] = useState<Tab>(initialTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "forgeSettings", label: t("label.menu_entry") },
    { key: "categorySettings", label: t("categories.menu_entry") },
    { key: "manageRoles", label: t("roles.menu_entry") },
  ];

  return (
    <div className={styles.admin}>
      <nav className={styles.tabs} role="tablist">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            aria-selected={tab === tb.key}
            className={clsx(styles.tab, tab === tb.key && styles.tabActive)}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </nav>
      <div className={styles.tabPanel} role="tabpanel">
        {tab === "forgeSettings" && <ForgeSettings siteKey={siteKey} />}
        {tab === "categorySettings" && <CategorySettings siteKey={siteKey} />}
        {tab === "manageRoles" && <ManageRoles siteKey={siteKey} />}
      </div>
    </div>
  );
}

export default function AdminApp({ siteKey, initialTab, language = "en" }: AdminAppProps) {
  const i18n = getAdminI18n(language);
  return (
    <I18nextProvider i18n={i18n}>
      <AdminTabs siteKey={siteKey} initialTab={initialTab} />
    </I18nextProvider>
  );
}
