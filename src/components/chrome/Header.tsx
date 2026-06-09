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
import { forgeBranding } from "~/components/forge/forgeBranding";
import { FORGE_STATUSES, forgeCategoryOptions } from "~/components/forge/forgeFacets";
import styles from "./Header.module.css";
import AdvancedSearchSync from "./AdvancedSearchSync.client";
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

/** Read a repeated request parameter into a Set (GraalJS-safe over a Java String[]). */
function paramSet(values: string[] | null | undefined): Set<string> {
  return new Set(values ? Array.from(values, String) : []);
}

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
 * URL of the configured store logo. The logo is stored as a JCR path string in the
 * site's forge settings (per-site OSGi config, read via the ForgeSettingsService
 * bridge); we resolve that path in the current (live) session and build its URL.
 * Falls back to the text brand if unset, dangling, or unpublished in this workspace.
 */
function siteLogoUrl(site: JCRNodeWrapper): string | null {
  try {
    const { logoPath } = forgeBranding(site.getResolveSite().getSiteKey());
    if (!logoPath) return null;
    const node = site.getSession().getNode(logoPath);
    return node ? buildNodeUrl(node) : null;
  } catch {
    // Unset / dangling / unpublished reference - fall back to the text brand.
    return null;
  }
}

/**
 * Store site header: brand, primary navigation (the home page's child pages),
 * a module search box, and a login island. Server-rendered chrome shared by
 * every page via Layout.
 */
export function Header(): JSX.Element {
  const { t } = useTranslation();
  const { renderContext, mainNode, currentResource } = useServerContext();
  const site = renderContext.getSite();
  const home = site.getHome();
  const siteTitle = site.getTitle();

  // Language switcher: the site's configured languages (sorted for a stable order),
  // each linking the current page/content in that language. Hidden for a single-language site.
  const languages = Array.from(site.getLanguages(), String).sort((a, b) => a.localeCompare(b));
  const currentLang = currentResource.getLocale().getLanguage();

  const homeUrl = home ? buildNodeUrl(home) : buildNodeUrl(site);
  const logoUrl = siteLogoUrl(site);

  const isLoggedIn = renderContext.isLoggedIn();
  // "My modules" is for module owners only (signed in AND holding a Store
  // administrator/developer role). It now lives in the account menu, so it is ALWAYS
  // removed from the main nav and surfaced as a menu item only when permitted.
  const canManageStore = isLoggedIn && site.hasPermission(STORE_ROLE_PERMISSION);
  const childPages = home
    ? getChildNodes(home, 50).filter((n) => n.isNodeType("jnt:page"))
    : [];
  const myModulesIds = home ? myModulesPageIds(home, childPages) : new Set<string>();
  const navPages = childPages.filter((n) => !myModulesIds.has(n.getIdentifier()));
  const myModulesPage = canManageStore
    ? (childPages.find((p) => myModulesIds.has(p.getIdentifier())) ?? null)
    : null;
  // Serializable nav links for the mobile disclosure island (same pages as the
  // desktop nav; the island only renders ≤720px where the desktop nav is hidden).
  const navLinks = navPages.map((p) => ({ href: buildNodeUrl(p), label: p.getDisplayableName() }));

  // Breadcrumb shown in the (sticky) header on a module/package detail page only —
  // mainNode is the forge entry there. "Home" links to the listing; the current
  // module name is plain text.
  const isForgeEntry = mainNode.isNodeType("jmix:forgeElement");
  const breadcrumbCurrent = isForgeEntry ? mainNode.getDisplayableName() : "";

  // The global search posts to the home modules list (?src_terms + status/category
  // facets), which filters server-side. The advanced panel reflects the active query
  // when already on the results page: pre-fill the term and pre-check the facets.
  const searchUrl = homeUrl;
  const request = renderContext.getRequest();
  const searchTerm = (request.getParameter("src_terms") || "").trim();
  const selectedStatuses = paramSet(request.getParameterValues("status"));
  const selectedCategories = paramSet(request.getParameterValues("category"));
  const categoryOptions = forgeCategoryOptions(site.getSiteKey(), mainNode.getSession());

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

        {isForgeEntry && (
          <nav className={styles.breadcrumb} aria-label={t("chrome.breadcrumb")} data-breadcrumb="">
            <a className={styles.breadcrumbLink} href={homeUrl} data-back-home="">
              {t("chrome.home")}
            </a>
            <span className={styles.breadcrumbSep} aria-hidden="true">
              /
            </span>
            <span className={styles.breadcrumbCurrent} aria-current="page">
              {breadcrumbCurrent}
            </span>
          </nav>
        )}

        <nav className={styles.nav} aria-label={t("chrome.nav.label")}>
          {navPages.map((p) => (
            <a key={p.getIdentifier()} className={styles.navLink} href={buildNodeUrl(p)}>
              {p.getDisplayableName()}
            </a>
          ))}
        </nav>

        <form className={styles.search} method="get" action={searchUrl} role="search">
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              type="search"
              name="src_terms"
              defaultValue={searchTerm}
              placeholder={t("chrome.search.placeholder")}
              aria-label={t("chrome.search.label")}
            />
            {/* Advanced search: a native <details> disclosure (no JS, keyboard-accessible)
                revealing status + category facets that post through the same GET pipeline. */}
            <details className={styles.advanced}>
              <summary className={styles.advancedToggle} aria-label={t("chrome.search.advanced")}>
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                  <path
                    d="M3 6l5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className={styles.advancedPanel}>
                <fieldset className={styles.advancedFacets}>
                  <legend className={styles.advancedLegend}>{t("store.filter.status")}</legend>
                  {FORGE_STATUSES.map((s) => (
                    <label key={s} className={styles.advancedFacet}>
                      <input
                        type="checkbox"
                        name="status"
                        value={s}
                        defaultChecked={selectedStatuses.has(s)}
                      />
                      <span className={styles.advancedStatus}>{s}</span>
                    </label>
                  ))}
                </fieldset>
                {categoryOptions.length > 0 && (
                  <fieldset className={styles.advancedFacets}>
                    <legend className={styles.advancedLegend}>{t("store.filter.categories")}</legend>
                    {categoryOptions.map((c) => (
                      <label key={c.uuid} className={styles.advancedFacet}>
                        <input
                          type="checkbox"
                          name="category"
                          value={c.uuid}
                          defaultChecked={selectedCategories.has(c.uuid)}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
                <button type="submit" className="store-btn store-btn--primary">
                  {t("chrome.search.submit")}
                </button>
              </div>
            </details>
          </div>
          {/* The header is cached chrome (it doesn't vary by query string), so its
              server-rendered checked/value state can drift from the live URL. This island
              reflects ?src_terms/?status/?category back into the panel on load, keeping it
              in sync with the (fresh) left filter rail. */}
          <Island component={AdvancedSearchSync} />
        </form>

        {languages.length > 1 && (
          <details className={styles.langSwitcher}>
            <summary className={styles.langToggle} aria-label={t("chrome.language.choose")} data-lang-toggle="">
              <svg
                className={styles.langGlobe}
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.3" />
                <ellipse cx="8" cy="8" rx="3" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <span className={styles.langCurrent}>{currentLang.toUpperCase()}</span>
            </summary>
            <nav className={styles.langMenu} aria-label={t("chrome.language.label")}>
              {languages.map((lang) => (
                <a
                  key={lang}
                  className={styles.langLink}
                  href={buildNodeUrl(mainNode, { language: lang })}
                  hrefLang={lang}
                  aria-current={lang === currentLang ? "true" : undefined}
                  data-lang-switch=""
                >
                  {lang.toUpperCase()}
                </a>
              ))}
            </nav>
          </details>
        )}

        {isLoggedIn ? (
          /* Account menu: a native <details> disclosure (dismissed by the
             AdvancedSearchSync island like the other header disclosures). The summary
             is the username; the panel holds "My modules" (owners) + Log out. */
          <details className={styles.account}>
            <summary className={styles.accountToggle} data-account-toggle="">
              <span className={styles.accountName} title={username}>
                {username}
              </span>
              <svg
                className={styles.accountCaret}
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M3 6l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <div className={styles.accountMenu}>
              {myModulesPage && (
                <a className={styles.accountItem} href={buildNodeUrl(myModulesPage)} data-my-modules="">
                  {myModulesPage.getDisplayableName()}
                </a>
              )}
              {/* Jahia's logout servlet accepts GET, so a plain form navigates without JS/CSRF. */}
              <form className={styles.accountLogoutForm} method="get" action={logoutUrl}>
                <button type="submit" className={styles.accountItem} data-logout="">
                  {t("chrome.login.signOut")}
                </button>
              </form>
            </div>
          </details>
        ) : (
          <Island
            component={Login}
            props={{
              loginUrl,
              loginRedirect,
              labels: {
                signIn: t("chrome.login.signIn"),
                username: t("chrome.login.username"),
                password: t("chrome.login.password"),
                invalidCredentials: t("chrome.login.invalidCredentials"),
                accountLocked: t("chrome.login.accountLocked"),
              },
            }}
          />
        )}

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
