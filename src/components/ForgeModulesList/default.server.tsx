import {
  getChildNodes,
  getNodesByJCRQuery,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import styles from "~/components/forge/forge.module.css";
import filterStyles from "~/components/forge/store-filter.module.css";
import { forgeRootCategoryUuid } from "~/components/forge/forgeBranding";

interface ForgeModulesListProps {
  startNode?: JCRNodeWrapper;
  nbOfModulePerPage?: number;
}

/** jmix:forgeElement status choicelist (definitions.cnd) — the fixed status facet options. */
const STATUSES = ["community", "labs", "prereleased", "supported", "legacy"];
const DEFAULT_PAGE_SIZE = 12;
/** Bound the total-count query so an unbounded catalogue can never run away. */
const COUNT_CAP = 5000;

/** Escape a value for safe inclusion in a JCR-SQL2 string literal. */
const sql = (v: string): string => v.replaceAll("'", "''");

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
function buildWhere(basePath: string, term: string, statuses: string[], categories: string[]): string {
  const clauses = [`ISDESCENDANTNODE(e, '${sql(basePath)}')`, "e.[published] = true"];
  if (term) {
    // Strip LIKE wildcards (% _) and the escape char so a literal term (e.g. "%") can't widen
    // the scan to the whole catalogue (enumeration / CPU); we only want a substring match.
    const likeTerm = sql(term.toLowerCase()).replaceAll(/[%_\\]/g, "");
    clauses.push(`LOWER(e.[jcr:title]) LIKE '%${likeTerm}%'`);
  }
  if (statuses.length > 0) {
    // Match case-insensitively: the facet submits the lowercase choicelist key, but migrated
    // data may store the status with different casing (e.g. "Community" vs "community").
    const statusOr = statuses.map((s) => `LOWER(e.[status]) = '${sql(s.toLowerCase())}'`).join(" OR ");
    clauses.push(`(${statusOr})`);
  }
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
      STATUSES.includes(s),
    );
    const selectedCategories = multiParam(request.getParameterValues("category"));
    let page = Number.parseInt(request.getParameter("page") || "1", 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    // ---- category facet options (the site's root-category children) ----
    const rootUuid = forgeRootCategoryUuid(site.getSiteKey());
    const categoryOptions: { uuid: string; name: string }[] = [];
    if (rootUuid) {
      try {
        const root = session.getNodeByIdentifier(rootUuid);
        for (const c of getChildNodes(root, 200, 0, (n) => n.isNodeType("jnt:category"))) {
          categoryOptions.push({ uuid: c.getIdentifier(), name: c.getDisplayableName() });
        }
      } catch {
        // root category missing / not readable - no category facet.
      }
    }
    const allowedCategoryUuids = new Set(categoryOptions.map((c) => c.uuid));
    const categories = selectedCategories.filter((u) => allowedCategoryUuids.has(u));

    // ---- build the (filtered) query ----
    const where = buildWhere(basePath, term, statuses, categories);

    const total = getNodesByJCRQuery(
      session,
      `SELECT e.[jcr:uuid] FROM [jmix:forgeElement] AS e WHERE ${where}`,
      COUNT_CAP,
    ).length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;

    const entries = getNodesByJCRQuery(
      session,
      `SELECT * FROM [jmix:forgeElement] AS e WHERE ${where} ORDER BY e.[jcr:title] ASC`,
      pageSize,
      (page - 1) * pageSize,
    );

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
      search: t("store.filter.search"),
      placeholder: t("store.filter.placeholder"),
      status: t("store.filter.status"),
      categories: t("store.filter.categories"),
      apply: t("store.filter.apply"),
    };

    return (
      <div className={styles.layout} data-forge-list="">
        {/* A plain <div> (not <aside>): a complementary landmark nested in <main> trips axe. */}
        <form className={filterStyles.sidebar} method="get" data-forge-filter="">
          <input
            className={filterStyles.search}
            type="search"
            name="src_terms"
            defaultValue={term}
            placeholder={labels.placeholder}
            aria-label={labels.search}
          />
          <fieldset className={filterStyles.facets}>
            <legend className={filterStyles.legend}>{labels.status}</legend>
            {STATUSES.map((s) => (
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
          <button type="submit" className={`store-btn store-btn--primary ${filterStyles.apply}`}>
            {labels.apply}
          </button>
        </form>

        <div className={styles.gridArea}>
          {total === 0 ? (
            <div className={styles.empty}>
              {term || statuses.length || categories.length
                ? t("store.filter.none")
                : t("modulesList.empty")}
            </div>
          ) : (
            <>
              <p className={styles.truncated} data-list-count="">
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
