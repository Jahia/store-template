import {
  buildEndpointUrl,
  buildNodeUrl,
  getChildNodes,
  Island,
  useServerContext,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import styles from "./Header.module.css";
import Login from "./Login.client";

/**
 * Store site header: brand, primary navigation (the home page's child pages),
 * a module search box, and a login island. Server-rendered chrome shared by
 * every page via Layout.
 */
export function Header(): JSX.Element {
  const { t } = useTranslation();
  const { renderContext, mainNode } = useServerContext();
  const site = renderContext.getSite();
  const home = site.getHome();
  const siteTitle = site.getTitle();

  const homeUrl = home ? buildNodeUrl(home) : buildNodeUrl(site);
  const navPages = home
    ? getChildNodes(home, 50).filter((n) => n.isNodeType("jnt:page"))
    : [];

  // Search navigates to the home modules list; its StoreFilter island reads
  // ?src_terms and filters the grid.
  const searchUrl = homeUrl;

  const isLoggedIn = renderContext.isLoggedIn();
  let username = "";
  if (isLoggedIn) {
    username = renderContext.getUser().getName();
  }
  const loginUrl = buildNodeUrl(mainNode);
  const logoutUrl = buildEndpointUrl(renderContext.getURLGenerator().getLogout());

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href={homeUrl}>
          <span className={styles.brandMark} aria-hidden="true" />
          {siteTitle || "Jahia Store"}
        </a>

        <nav className={styles.nav} aria-label="Main navigation">
          {navPages.map((p) => (
            <a key={p.getIdentifier()} className={styles.navLink} href={buildNodeUrl(p)}>
              {p.getDisplayableName()}
            </a>
          ))}
        </nav>

        <form className={styles.search} method="get" action={searchUrl} role="search">
          <input
            className={styles.searchInput}
            type="search"
            name="src_terms"
            placeholder={t("chrome.search.placeholder")}
            aria-label={t("chrome.search.label")}
          />
        </form>

        <Island
          component={Login}
          props={{
            isLoggedIn,
            username,
            loginUrl,
            logoutUrl,
            labels: {
              signIn: t("chrome.login.signIn"),
              signOut: t("chrome.login.signOut"),
              username: t("chrome.login.username"),
              password: t("chrome.login.password"),
              rememberMe: t("chrome.login.rememberMe"),
            },
          }}
        />
      </div>
    </header>
  );
}
