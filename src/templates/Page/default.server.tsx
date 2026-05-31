import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "~/templates/Layout";

/**
 * Default page template for jnt:page.
 *
 * Phase 0 skeleton — renders the document shell with a single editable `main`
 * area so any page on a store-template site renders through the JS engine.
 * Real page templates (home, search, module detail, edit, site-admin) are
 * ported in later phases.
 */
jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "default",
    displayName: "Store page (default)",
    componentType: "template",
  },
  ({ "jcr:title": title }: { "jcr:title"?: string }, { currentNode }) => (
    <Layout title={title}>
      <main>
        <h1 data-store-template="js">{title ?? currentNode.getName()}</h1>
        <Area name="main" />
      </main>
    </Layout>
  ),
);
