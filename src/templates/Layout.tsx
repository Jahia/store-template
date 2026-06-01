import type { ReactNode } from "react";
import { AddResources, buildModuleFileUrl, useServerContext } from "@jahia/javascript-modules-library";
import "~/styles/global.css";
import styles from "./Layout.module.css";
import { Header } from "~/components/chrome/Header";
import { Footer } from "~/components/chrome/Footer";

/**
 * Store document shell: <head> (SEO + the module's single style.css) plus the
 * site chrome (header / main / footer). Used by every page template.
 */
export const Layout = ({ title, children }: { title?: string; children: ReactNode }): JSX.Element => {
  const { renderContext } = useServerContext();
  const siteTitle = renderContext.getSite().getTitle();
  const pageTitle = title ? `${title} - ${siteTitle}` : siteTitle || "Jahia Store";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
      </head>
      <body>
        <div className={styles.page}>
          <Header />
          <main className={styles.main}>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
};
