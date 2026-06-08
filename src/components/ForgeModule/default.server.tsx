import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { ForgeEntryCard } from "~/components/forge/ForgeEntryCard";
import { excerpt, forgeAuthor, forgeCategoryNames, forgeIconUrl } from "~/components/forge/forgeCard";

interface ForgeEntryProps {
  "jcr:title"?: string;
  description?: string;
  status?: string;
}

/** Card view of a forge module in a list. */
jahiaComponent(
  {
    nodeType: "jnt:forgeModule",
    name: "default",
    displayName: "Module card",
    componentType: "view",
    properties: { "cache.mainResource": "true" },
  },
  ({ "jcr:title": title, description, status }: ForgeEntryProps, { currentNode }) => {
    return (
      <ForgeEntryCard
        title={title || currentNode.getName()}
        excerpt={excerpt(description || "")}
        iconUrl={forgeIconUrl(currentNode)}
        detailUrl={buildNodeUrl(currentNode)}
        status={status}
        author={forgeAuthor(currentNode)}
        categories={forgeCategoryNames(currentNode)}
      />
    );
  },
);
