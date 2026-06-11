import type { ReactNode } from "react";
import { AddResources, buildModuleFileUrl, useServerContext } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
// Self-hosted Nunito Sans (variable, weight axis 200-1000, normal). Bundled into
// the module's single style.css; Vite emits the per-subset woff2 into dist/assets
// (served via the module's static-resources). font-display:swap + unicode-range
// mean only the subset a page needs is fetched. The family is wired into
// --font-sans in global.css; the system stack stays as the swap fallback.
import "@fontsource-variable/nunito-sans/wght.css";
import "~/styles/global.css";
import styles from "./Layout.module.css";
import { Header } from "~/components/chrome/Header";
import { Footer } from "~/components/chrome/Footer";

/** Anchor id of the main landmark, target of the keyboard skip-navigation link. */
const MAIN_ID = "store-main";

/**
 * Language code for <html lang>, derived from the rendered resource's locale
 * (e.g. ForgeEntryDetail reads the same currentResource.getLocale().getLanguage()).
 * Fails soft to "en" if the locale can't be resolved.
 */
function htmlLang(currentResource: { getLocale(): { getLanguage(): string } }): string {
  try {
    return currentResource.getLocale().getLanguage() || "en";
  } catch {
    return "en";
  }
}

/**
 * Store document shell: <head> (SEO + the module's single style.css) plus the
 * site chrome (header / main / footer). Used by every page template.
 */
export const Layout = ({ title, children }: { title?: string; children: ReactNode }): JSX.Element => {
  const { t } = useTranslation();
  const { renderContext, currentResource } = useServerContext();
  const siteTitle = renderContext.getSite().getTitle();
  const pageTitle = title ? `${title} - ${siteTitle}` : siteTitle || "Jahia Store";
  // Reflect the rendered content language on <html lang> (falls back to "en").
  const lang = htmlLang(currentResource);

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
      </head>
      <body>
        {/* First focusable element: lets keyboard users bypass the header (WCAG 2.4.1). */}
        <a href={`#${MAIN_ID}`} className="sr-only sr-only--focusable">
          {t("chrome.skipToMain")}
        </a>
        <div className={styles.page}>
          <Header />
          <main id={MAIN_ID} className={styles.main}>
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
};
