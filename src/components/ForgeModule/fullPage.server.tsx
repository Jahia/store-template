import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "~/templates/Layout";
import { ForgeEntryDetail } from "~/components/forge/ForgeEntryDetail";

/**
 * Content template: renders a forge module as a full detail page (main resource).
 * Picked when a module node is requested as a page (e.g. from a card link).
 */
jahiaComponent(
  {
    nodeType: "jnt:forgeModule",
    name: "default",
    displayName: "Module page",
    componentType: "template",
  },
  (_props, { currentNode }) => {
    const title = currentNode.hasProperty("jcr:title")
      ? currentNode.getProperty("jcr:title").getString()
      : currentNode.getName();
    return (
      <Layout title={title}>
        <ForgeEntryDetail node={currentNode} />
      </Layout>
    );
  },
);
