import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "~/templates/Layout";
import { ForgeEntryDetail } from "~/components/forge/ForgeEntryDetail";

/** Content template: renders a forge package as a full detail page (main resource). */
jahiaComponent(
  {
    nodeType: "jnt:forgePackage",
    name: "default",
    displayName: "Package page",
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
