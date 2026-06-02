import {
  getNodesByJCRQuery,
  Island,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import styles from "~/components/forge/forge.module.css";
import { forgeCategoryNames } from "~/components/forge/forgeCard";
import StoreFilter from "~/components/forge/StoreFilter.client";

interface ForgeModulesListProps {
  startNode?: JCRNodeWrapper;
  nbOfModulePerPage?: number;
}

/**
 * Storefront list: a responsive grid of published forge modules & packages with
 * an instant client-side filter (status facets + text), replacing the legacy
 * isotope/select2 UI. The cards are server-rendered (SEO); the StoreFilter
 * island filters them client-side and syncs the URL, so the header search
 * (`?src_terms=`) seeds the filter.
 */
jahiaComponent(
  {
    nodeType: "jnt:forgeModulesList",
    name: "default",
    displayName: "Modules list",
    componentType: "view",
  },
  ({ startNode, nbOfModulePerPage }: ForgeModulesListProps, { currentNode, renderContext }) => {
    const { t } = useTranslation();
    const site = renderContext.getSite();
    const basePath = startNode ? startNode.getPath() : `${site.getPath()}/contents/modules-repository`;
    const limit = nbOfModulePerPage && nbOfModulePerPage > 0 ? Number(nbOfModulePerPage) : 60;

    const query =
      `SELECT * FROM [jmix:forgeElement] AS e ` +
      `WHERE ISDESCENDANTNODE(e, '${basePath}') AND e.[published] = true ` +
      `ORDER BY e.[jcr:title] ASC`;

    const entries = getNodesByJCRQuery(currentNode.getSession(), query, limit);

    if (entries.length === 0) {
      return <div className={styles.empty}>{t("modulesList.empty")}</div>;
    }

    // The grid renders at most `limit` cards. Surface the truncation so it is not
    // silent: count the total matching entries (bounded so an unbounded query never
    // runs) and show "Showing N of M" when the total exceeds what is rendered (the
    // StoreFilter only sees the rendered cards).
    const COUNT_CAP = 2000;
    const totalQuery =
      `SELECT e.[jcr:uuid] FROM [jmix:forgeElement] AS e ` +
      `WHERE ISDESCENDANTNODE(e, '${basePath}') AND e.[published] = true`;
    const total = getNodesByJCRQuery(currentNode.getSession(), totalQuery, COUNT_CAP).length;
    const truncated = total > entries.length;

    const statuses = [
      ...new Set(
        entries
          .map((e) => (e.hasProperty("status") ? e.getProperty("status").getString() : ""))
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));

    // Facet list: every category any listed entry is filed under.
    const categories = [...new Set(entries.flatMap((e) => forgeCategoryNames(e)))].sort((a, b) =>
      a.localeCompare(b),
    );

    const labels = {
      search: t("store.filter.search"),
      placeholder: t("store.filter.placeholder"),
      status: t("store.filter.status"),
      categories: t("store.filter.categories"),
      unit: t("store.filter.unit"),
      none: t("store.filter.none"),
    };

    return (
      <div className={styles.layout} data-forge-list="">
        <Island component={StoreFilter} props={{ statuses, categories, labels }} />
        <div className={styles.gridArea}>
          {truncated && (
            <p className={styles.truncated} data-list-truncated="">
              {t("modulesList.showingCount", { shown: entries.length, total })}
            </p>
          )}
          <div className={styles.grid}>
            {entries.map((node) => (
              <Render key={node.getIdentifier()} node={node} view="default" readOnly />
            ))}
          </div>
        </div>
      </div>
    );
  },
);
