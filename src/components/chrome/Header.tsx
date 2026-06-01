import {
  buildEndpointUrl,
  buildNodeUrl,
  getChildNodes,
  getNodesByJCRQuery,
  Island,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import styles from "./Header.module.css";
import Login from "./Login.client";

/**
 * Permission granted only by the "Store administrator" and "Store developer"
 * site roles (see privateappstore roles.xml). We use it as the faithful proxy
 * for "this user may manage their own modules", gating the My-modules nav entry.
 */
const STORE_ROLE_PERMISSION = "jahiaForgeUploadModule";

/**
 * Identifiers of nav pages that host the developer-only "My modules" list
 * (jnt:forgeMyModulesList). Detected semantically — by content type, not by a
 * hard-coded page name — so renaming the page keeps it gated. These pages are
 * hidden from the nav unless the visitor is a Store administrator/developer.
 */
function myModulesPageIds(home: JCRNodeWrapper): Set<string> {
  const ids = new Set<string>();
  try {
    const lists = getNodesByJCRQuery(
      home.getSession(),
      `SELECT * FROM [jnt:forgeMyModulesList] AS l WHERE ISDESCENDANTNODE(l, '${home.getPath()}')`,
      20,
    );
    for (const list of lists) {
      let owner: JCRNodeWrapper | null = list;
      // Walk up to the page that owns this list (getParent throws at the root).
      while (owner && !owner.isNodeType("jnt:page")) {
        try {
          owner = owner.getParent() as unknown as JCRNodeWrapper;
        } catch {
          owner = null;
        }
      }
      if (owner) ids.add(owner.getIdentifier());
    }
  } catch {
    // No query support / no such content — nothing to gate.
  }
  return ids;
}

/**
 * URL of the configured store logo (the `forgeSettingsLogo` weakreference on the
 * site node, set in Store administration → Settings), or null. Resolving a
 * weakreference can throw if it dangles or the target is not in this workspace,
 * so we fall back to the text brand on any failure.
 */
function siteLogoUrl(site: JCRNodeWrapper): string | null {
  try {
    if (site.hasProperty("forgeSettingsLogo")) {
      const node = site.getProperty("forgeSettingsLogo").getNode();
      return node ? buildNodeUrl(node) : null;
    }
  } catch {
    // Dangling / unpublished reference — fall back to the text brand.
  }
  return null;
}

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
  const logoUrl = siteLogoUrl(site);

  const isLoggedIn = renderContext.isLoggedIn();
  // "My modules" is for module owners only: shown when signed in AND the user
  // holds a Store administrator/developer role (jahiaForgeUploadModule).
  const canManageStore = isLoggedIn && site.hasPermission(STORE_ROLE_PERMISSION);
  const restrictedPages = home && !canManageStore ? myModulesPageIds(home) : new Set<string>();
  const navPages = home
    ? getChildNodes(home, 50).filter(
        (n) => n.isNodeType("jnt:page") && !restrictedPages.has(n.getIdentifier()),
      )
    : [];

  // Search navigates to the home modules list; its StoreFilter island reads
  // ?src_terms and filters the grid.
  const searchUrl = homeUrl;

  let username = "";
  if (isLoggedIn) {
    username = renderContext.getUser().getName();
  }
  // Jahia's form login is the /cms/login servlet (NOT a POST to the page, which
  // returns 401). It authenticates username+password and redirects to `redirect`.
  const loginUrl = buildEndpointUrl(renderContext.getURLGenerator().getLogin());
  const loginRedirect = buildNodeUrl(mainNode);
  const logoutUrl = buildEndpointUrl(renderContext.getURLGenerator().getLogout());

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href={homeUrl}>
          {logoUrl ? (
            <img className={styles.logo} src={logoUrl} alt={siteTitle || "Store"} height="36" />
          ) : (
            <>
              <span className={styles.brandMark} aria-hidden="true" />
              {siteTitle || "Jahia Store"}
            </>
          )}
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
            loginRedirect,
            logoutUrl,
            labels: {
              signIn: t("chrome.login.signIn"),
              signOut: t("chrome.login.signOut"),
              username: t("chrome.login.username"),
              password: t("chrome.login.password"),
            },
          }}
        />
      </div>
    </header>
  );
}
