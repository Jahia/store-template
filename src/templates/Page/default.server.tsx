import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "~/templates/Layout";

/**
 * Default page template for jnt:page.
 *
 * Phase 0 skeleton - renders the document shell with a single editable `main`
 * area so any page on a jahia-store-template site renders through the JS engine.
 * Real page templates (home, search, module detail, edit) are ported in later
 * phases. Store administration lives in the Jahia site administration (jContent).
 */
jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "default",
    displayName: "Store page (default)",
    componentType: "template",
  },
  ({ "jcr:title": title }: { "jcr:title"?: string }, { currentNode }) => (
    // Layout supplies the single <main> landmark; this template only fills it.
    <Layout title={title}>
      <h1 data-jahia-store-template="js">{title ?? currentNode.getName()}</h1>
      <Area name="main" />
    </Layout>
  ),
);
