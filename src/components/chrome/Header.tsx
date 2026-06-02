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
import MobileNav from "./MobileNav.client";

/**
 * Permission granted only by the "Store administrator" and "Store developer"
 * site roles (see jahia-store roles.xml). We use it as the faithful proxy
 * for "this user may manage their own modules", gating the My-modules nav entry.
 */
const STORE_ROLE_PERMISSION = "jahiaForgeUploadModule";

/** Conventional node name of the "My modules" page in the jahia-store-template seed. */
const MY_MODULES_PAGE_NAME = "my-modules";

/**
 * Identifiers of nav pages that host the developer-only "My modules" list
 * (jnt:forgeMyModulesList). These are hidden from the nav unless the visitor is a
 * Store administrator/developer.
 *
 * The gate must FAIL CLOSED: detection runs with the visitor's own session, so an
 * anonymous (or under-privileged) visitor may be able to see the page node (it is
 * in the nav) yet NOT its `mine` list content (unpublished, or content-level ACL).
 * The old purely-semantic query then returned nothing and the entry leaked. So we
 * combine two signals, taking the union:
 *   1. semantic, by content type (rename-safe — wins whenever the list is visible);
 *   2. the conventional page name (always readable, since the page is in the nav)
 *      as a safety net that keeps the gate closed when the list is invisible.
 */
function myModulesPageIds(home: JCRNodeWrapper, childPages: JCRNodeWrapper[]): Set<string> {
  const ids = new Set<string>();

  // 1. Semantic detection: any page whose subtree holds a jnt:forgeMyModulesList.
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
    // No query support / list not visible to this visitor - the name net below
    // still keeps the default seed page gated.
  }

  // 2. Safety net: the conventional seed page name. Closes the gate even when the
  // list content is unpublished / ACL-hidden for the current visitor.
  for (const page of childPages) {
    if (page.getName() === MY_MODULES_PAGE_NAME) ids.add(page.getIdentifier());
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
    // Dangling / unpublished reference - fall back to the text brand.
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
  const childPages = home
    ? getChildNodes(home, 50).filter((n) => n.isNodeType("jnt:page"))
    : [];
  const restrictedPages =
    home && !canManageStore ? myModulesPageIds(home, childPages) : new Set<string>();
  const navPages = childPages.filter((n) => !restrictedPages.has(n.getIdentifier()));
  // Serializable nav links for the mobile disclosure island (same pages as the
  // desktop nav; the island only renders ≤720px where the desktop nav is hidden).
  const navLinks = navPages.map((p) => ({ href: buildNodeUrl(p), label: p.getDisplayableName() }));

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

        <nav className={styles.nav} aria-label={t("chrome.nav.label")}>
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

        <Island
          component={MobileNav}
          props={{
            links: navLinks,
            searchAction: searchUrl,
            labels: {
              open: t("chrome.menu.open"),
              close: t("chrome.menu.close"),
              nav: t("chrome.nav.label"),
              searchPlaceholder: t("chrome.search.placeholder"),
              searchLabel: t("chrome.search.label"),
            },
          }}
        />
      </div>
    </header>
  );
}
