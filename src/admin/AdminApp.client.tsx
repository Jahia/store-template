import { I18nextProvider } from "react-i18next";
import { getAdminI18n } from "./i18n";
import { ForgeSettings } from "./ForgeSettings";

export interface AdminAppProps {
  app: "forgeSettings" | "categorySettings" | "manageRoles";
  siteKey: string;
  language?: string;
}

/**
 * Client island hosting an in-site admin screen.
 *
 * Provides a self-contained i18next instance, then renders the requested
 * screen. Screens fetch from /modules/graphql via the fetch helper in gql.ts
 * (no Apollo — see gql.ts for why). One hydration entry; screens are plain
 * imports bundled into it.
 */
export default function AdminApp({ app, siteKey, language = "en" }: AdminAppProps) {
  const i18n = getAdminI18n(language);

  return (
    <I18nextProvider i18n={i18n}>
      {app === "forgeSettings" && <ForgeSettings siteKey={siteKey} />}
    </I18nextProvider>
  );
}
