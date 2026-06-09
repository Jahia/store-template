import {
  getNodesByJCRQuery,
  Island,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import styles from "~/components/forge/forge.module.css";
import filterStyles from "~/components/forge/store-filter.module.css";
import { FORGE_STATUSES, forgeCategoryOptions } from "~/components/forge/forgeFacets";
import { latestReleaseDates } from "~/components/forge/versions";
import FilterAutoSubmit from "~/components/forge/FilterAutoSubmit.client";

interface ForgeModulesListProps {
  startNode?: JCRNodeWrapper;
  nbOfModulePerPage?: number;
}

const DEFAULT_PAGE_SIZE = 12;
/** Bound the matched-module fetch so an unbounded catalogue can never run away. */
const COUNT_CAP = 5000;

/** Escape a value for safe inclusion in a JCR-SQL2 string literal. */
const sql = (v: string): string => v.replaceAll("'", "''");

/** A module's display title (jcr:title), falling back to its node name — the ordering tiebreaker. */
const moduleTitle = (n: JCRNodeWrapper): string =>
  n.hasProperty("jcr:title") ? n.getProperty("jcr:title").getString() : n.getName();

/** Read a repeated request parameter as a string array (GraalJS-safe over a Java String[]). */
function multiParam(values: string[] | null | undefined): string[] {
  if (!values) return [];
  // `values` is a Java String[] (array-like) bridged into GraalJS; copy it to a JS array.
  return Array.from(values, String);
}

/**
 * Build the JCR-SQL2 WHERE clause for the published forge elements under `basePath`, narrowed
 * by the optional text / status / category filters. Each clause is assembled into an
 * intermediate variable (no nested template literals) and every interpolated value is escaped.
 */
function buildWhere(basePath: string, term: string, categories: string[]): string {
  const clauses = [`ISDESCENDANTNODE(e, '${sql(basePath)}')`, "e.[published] = true"];
  if (term) {
    // Advanced-search scope: match the term across the title, the module id (node name)
    // and the description. Strip LIKE wildcards (% _) and the escape char so a literal
    // term (e.g. "%") can't widen the scan to the whole catalogue (enumeration / CPU);
    // we only want a substring match.
    const likeTerm = sql(term.toLowerCase()).replaceAll(/[%_\\]/g, "");
    const pattern = `'%${likeTerm}%'`;
    const textOr = [
      `LOWER(e.[jcr:title]) LIKE ${pattern}`,
      `LOWER(LOCALNAME(e)) LIKE ${pattern}`,
      `LOWER(e.[description]) LIKE ${pattern}`,
    ].join(" OR ");
    clauses.push(`(${textOr})`);
  }
  // NB: `status` is intentionally NOT in the WHERE. It is declared `indexed=no` in the CND, so a
  // JCR-SQL2 constraint on it only resolves in the site's DEFAULT language and returns nothing in
  // other languages (the FR storefront bug). It is filtered in application code instead (below),
  // reading the shared property directly — which is language-independent.
  if (categories.length > 0) {
    const categoryOr = categories.map((u) => `e.[j:defaultCategory] = '${sql(u)}'`).join(" OR ");
    clauses.push(`(${categoryOr})`);
  }
  return clauses.join(" AND ");
}

/**
 * Storefront list: a responsive grid of published forge modules & packages.
 *
 * Filtering (status / category facets + text) and pagination are SERVER-SIDE: the JCR query is
 * constrained and offset/limited per page, so the facets search the WHOLE catalogue rather than
 * one page, and arbitrarily large catalogues stay reachable. State lives in the URL
 * (`src_terms`, `status`, `category`, `page`) via a plain GET form + page links, so the view is
 * shareable/SEO-friendly and seeds from the header search (`src_terms`). The fragment is rendered
 * fresh (`cache.expiration: 0`) so those parameters are always honoured.
 */
jahiaComponent(
  {
    nodeType: "jnt:forgeModulesList",
    name: "default",
    displayName: "Modules list",
    componentType: "view",
    // Vary by the filter/page query params: render fresh instead of serving a cached page 1.
    properties: { "cache.expiration": "0" },
  },
  ({ startNode, nbOfModulePerPage }: ForgeModulesListProps, { currentNode, renderContext }) => {
    const { t } = useTranslation();
    const site = renderContext.getSite();
    const session = currentNode.getSession();
    const request = renderContext.getRequest();
    const basePath = startNode ? startNode.getPath() : `${site.getPath()}/contents/modules-repository`;
    const pageSize =
      nbOfModulePerPage && nbOfModulePerPage > 0 ? Number(nbOfModulePerPage) : DEFAULT_PAGE_SIZE;

    // ---- current filter state (from the URL) ----
    const term = (request.getParameter("src_terms") || "").trim();
    const statuses = multiParam(request.getParameterValues("status")).filter((s) =>
      FORGE_STATUSES.includes(s),
    );
    const selectedCategories = multiParam(request.getParameterValues("category"));
    let page = Number.parseInt(request.getParameter("page") || "1", 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    // ---- category facet options (the site's root-category children) ----
    const categoryOptions = forgeCategoryOptions(site.getSiteKey(), session);
    const allowedCategoryUuids = new Set(categoryOptions.map((c) => c.uuid));
    const categories = selectedCategories.filter((u) => allowedCategoryUuids.has(u));

    // ---- build the (filtered) query ----
    const where = buildWhere(basePath, term, categories);
    const statusFilter = new Set(statuses.map((s) => s.toLowerCase()));

    // Fetch the text/category-matched modules, then refine + order in-app:
    //   - status: `status` is indexed=no (CND) so a JCR-SQL2 constraint on it only resolves in the
    //     site's default language and returns nothing in others (the FR storefront bug); we filter
    //     it on the shared `status` property (language-independent) instead.
    //   - order: newest release first. A module's release date lives on its child version nodes,
    //     which JCR-SQL2 can't ORDER BY from the module, so we sort in-app against the
    //     catalogue-wide release-date map (ties broken by title for a stable, pleasant order).
    // Sorting must precede pagination, so we page the ordered set in memory.
    let matched = getNodesByJCRQuery(
      session,
      `SELECT * FROM [jmix:forgeElement] AS e WHERE ${where}`,
      COUNT_CAP,
    );
    if (statusFilter.size > 0) {
      matched = matched.filter((n) =>
        statusFilter.has((n.hasProperty("status") ? n.getProperty("status").getString() : "").toLowerCase()),
      );
    }

    const releaseDates = latestReleaseDates(session, basePath);
    const ordered = matched
      .map((node) => ({ node, date: releaseDates.get(node.getIdentifier()) ?? "" }))
      .sort((a, b) => b.date.localeCompare(a.date) || moduleTitle(a.node).localeCompare(moduleTitle(b.node)));

    const total = ordered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;

    const entries = ordered
      .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
      .map((d) => d.node);

    // ---- URL helpers (relative query strings; reuse the current page path). Built by hand
    // rather than with URLSearchParams, which is not available in the GraalJS SSR runtime. ----
    const pageHref = (n: number): string => {
      const parts: string[] = [];
      if (term) parts.push(`src_terms=${encodeURIComponent(term)}`);
      for (const s of statuses) parts.push(`status=${encodeURIComponent(s)}`);
      for (const c of categories) parts.push(`category=${encodeURIComponent(c)}`);
      parts.push(`page=${n}`);
      return `?${parts.join("&")}`;
    };

    const labels = {
      status: t("store.filter.status"),
      categories: t("store.filter.categories"),
      apply: t("store.filter.apply"),
      autoApplyHint: t("store.filter.autoApplyHint"),
    };

    return (
      <div className={styles.layout} data-forge-list="">
        {/* Left column: the Status/Category filter rail. A plain <div> (not <aside>): a
            complementary landmark nested in <main> trips the axe AAA gate. */}
        <div className={styles.sidebarColumn}>
          <form className={filterStyles.sidebar} method="get" data-forge-filter="">
            {/* Text search lives in the header's global search — carry the active term so toggling
                a facet keeps it (a GET form only submits its own fields). */}
            {term && <input type="hidden" name="src_terms" value={term} />}
            <fieldset className={filterStyles.facets}>
              <legend className={filterStyles.legend}>{labels.status}</legend>
              {/* Alphabetical so the facet is easy to scan (the constant keeps lifecycle order). */}
              {[...FORGE_STATUSES]
                .sort((a, b) => a.localeCompare(b))
                .map((s) => (
                  <label key={s} className={filterStyles.facet}>
                    <input type="checkbox" name="status" value={s} defaultChecked={statuses.includes(s)} />
                    <span className={filterStyles.facetStatus}>{s}</span>
                  </label>
                ))}
            </fieldset>
            {categoryOptions.length > 0 && (
              <fieldset className={filterStyles.facets}>
                <legend className={filterStyles.legend}>{labels.categories}</legend>
                {categoryOptions.map((c) => (
                  <label key={c.uuid} className={filterStyles.facet}>
                    <input
                      type="checkbox"
                      name="category"
                      value={c.uuid}
                      defaultChecked={categories.includes(c.uuid)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {/* Filters apply on change once the island hydrates; announce it (WCAG SC 3.2.2). */}
            <p className="sr-only">{labels.autoApplyHint}</p>
            <Island component={FilterAutoSubmit} />
            {/* No-JS fallback: rendered only when scripting is off, so JS users (who get
                auto-apply on change) never see the button flash in after a reload. */}
            <noscript>
              <button type="submit" className={`store-btn store-btn--primary ${filterStyles.apply}`}>
                {labels.apply}
              </button>
            </noscript>
          </form>
        </div>

        <div className={styles.gridArea}>
          {total === 0 ? (
            <div className={styles.empty}>
              {term || statuses.length || categories.length
                ? t("store.filter.none")
                : t("modulesList.empty")}
            </div>
          ) : (
            <>
              <p
                className={styles.truncated}
                data-list-count=""
                aria-live="polite"
                aria-atomic="true"
              >
                {t("modulesList.showingCount", { shown: entries.length, total })}
              </p>
              <div className={styles.grid}>
                {entries.map((node) => (
                  <Render key={node.getIdentifier()} node={node} view="default" readOnly />
                ))}
              </div>
              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label={t("modulesList.pagination")} data-forge-pagination="">
                  {page > 1 && (
                    <a className="store-btn store-btn--ghost" href={pageHref(page - 1)} rel="prev" data-page-prev="">
                      {t("modulesList.previous")}
                    </a>
                  )}
                  <span className={styles.pageInfo} data-page-info="">
                    {t("modulesList.pageOf", { page, pages: totalPages })}
                  </span>
                  {page < totalPages && (
                    <a className="store-btn store-btn--ghost" href={pageHref(page + 1)} rel="next" data-page-next="">
                      {t("modulesList.next")}
                    </a>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
);
