import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { ForgeEntryCard } from "~/components/forge/ForgeEntryCard";
import { excerpt, forgeIconUrl } from "~/components/forge/forgeCard";

interface ForgeEntryProps {
  "jcr:title"?: string;
  description?: string;
  status?: string;
  supportedByJahia?: boolean;
  reviewedByJahia?: boolean;
}

/** Card view of a forge package in a list (same presentation as a module). */
jahiaComponent(
  {
    nodeType: "jnt:forgePackage",
    name: "default",
    displayName: "Package card",
    componentType: "view",
    properties: { "cache.mainResource": "true" },
  },
  (
    { "jcr:title": title, description, status, supportedByJahia, reviewedByJahia }: ForgeEntryProps,
    { currentNode },
  ) => (
    <ForgeEntryCard
      title={title || currentNode.getName()}
      excerpt={excerpt(description || "")}
      iconUrl={forgeIconUrl(currentNode)}
      detailUrl={buildNodeUrl(currentNode)}
      status={status}
      supported={Boolean(supportedByJahia)}
      reviewed={Boolean(reviewedByJahia)}
    />
  ),
);
