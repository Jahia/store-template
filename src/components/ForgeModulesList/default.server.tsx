import {
  getNodesByJCRQuery,
  Island,
  jahiaComponent,
  Render,
  useServerContext,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import styles from "~/components/forge/forge.module.css";
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
      return <div className={styles.empty}>No published modules yet.</div>;
    }

    const statuses = [
      ...new Set(
        entries
          .map((e) => (e.hasProperty("status") ? e.getProperty("status").getString() : ""))
          .filter(Boolean),
      ),
    ].sort();

    const labels = {
      search: t("store.filter.search"),
      placeholder: t("store.filter.placeholder"),
      status: t("store.filter.status"),
      all: t("store.filter.all"),
      unit: t("store.filter.unit"),
      none: t("store.filter.none"),
    };

    return (
      <div data-forge-list="">
        <Island component={StoreFilter} props={{ statuses, labels }} />
        <div className={styles.grid}>
          {entries.map((node) => (
            <Render key={node.getIdentifier()} node={node as JCRNodeWrapper} view="default" readOnly />
          ))}
        </div>
      </div>
    );
  },
);
