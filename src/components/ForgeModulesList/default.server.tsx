import {
  getNodesByJCRQuery,
  jahiaComponent,
  Render,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import styles from "~/components/forge/forge.module.css";

interface ForgeModulesListProps {
  startNode?: JCRNodeWrapper;
  nbOfModulePerPage?: number;
}

/**
 * Storefront list: a responsive grid of published forge modules & packages.
 *
 * Queries jmix:forgeElement (the mixin shared by jnt:forgeModule and
 * jnt:forgePackage) under the configured start node — or, by default, the
 * site's modules-repository — keeping only published entries, then renders each
 * with its `default` (card) view. Filtering by category/tag/status (the legacy
 * isotope/select2 UI) arrives in a later Phase 2 slice.
 */
jahiaComponent(
  {
    nodeType: "jnt:forgeModulesList",
    name: "default",
    displayName: "Modules list",
    componentType: "view",
  },
  ({ startNode, nbOfModulePerPage }: ForgeModulesListProps, { currentNode, renderContext }) => {
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

    return (
      <div className={styles.grid}>
        {entries.map((node) => (
          <Render key={node.getIdentifier()} node={node as JCRNodeWrapper} view="default" readOnly />
        ))}
      </div>
    );
  },
);
