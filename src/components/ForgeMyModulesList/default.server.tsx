import {
  getNodesByJCRQuery,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import styles from "~/components/forge/forge.module.css";

/**
 * The logged-in user's own modules/packages (published or not), queried by
 * `jcr:createdBy`, rendered as cards. Replaces forgeMyModulesList.v2.jsp's
 * createdBy query. (The JAR upload control is authoring — Phase 3.)
 */
jahiaComponent(
  {
    nodeType: "jnt:forgeMyModulesList",
    name: "default",
    displayName: "My modules",
    componentType: "view",
  },
  (_props: object, { currentNode, renderContext }) => {
    if (!renderContext.isLoggedIn()) {
      return <div className={styles.empty}>Please log in to see your modules.</div>;
    }

    const site = renderContext.getSite();
    // Developer-only area: same gate as the My-modules nav entry. A logged-in
    // user without a Store administrator/developer role has no modules to manage.
    if (!site.hasPermission("jahiaForgeUploadModule")) {
      return (
        <div className={styles.empty}>
          You need the Store developer or Store administrator role to submit modules.
        </div>
      );
    }

    const basePath = `${site.getPath()}/contents/modules-repository`;
    const username = renderContext.getUser().getName().replaceAll("'", "''");

    const query =
      `SELECT * FROM [jmix:forgeElement] AS e ` +
      `WHERE ISDESCENDANTNODE(e, '${basePath}') AND e.[jcr:createdBy] = '${username}' ` +
      `ORDER BY e.[jcr:title] ASC`;

    const entries = getNodesByJCRQuery(currentNode.getSession(), query, 100);

    if (entries.length === 0) {
      return <div className={styles.empty}>You have not submitted any modules yet.</div>;
    }

    return (
      <div className={styles.grid}>
        {entries.map((node) => (
          <Render key={node.getIdentifier()} node={node} view="default" readOnly />
        ))}
      </div>
    );
  },
);
