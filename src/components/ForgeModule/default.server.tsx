import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import { ForgeEntryCard } from "~/components/forge/ForgeEntryCard";
import { excerpt, forgeAuthor, forgeCategoryNames, forgeIconUrl } from "~/components/forge/forgeCard";

interface ForgeEntryProps {
  "jcr:title"?: string;
  description?: string;
  status?: string;
  supportedByJahia?: boolean;
  reviewedByJahia?: boolean;
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
  (
    { "jcr:title": title, description, status, supportedByJahia, reviewedByJahia }: ForgeEntryProps,
    { currentNode },
  ) => {
    const { t } = useTranslation();
    return (
      <ForgeEntryCard
        title={title || currentNode.getName()}
        excerpt={excerpt(description || "")}
        iconUrl={forgeIconUrl(currentNode)}
        detailUrl={buildNodeUrl(currentNode)}
        status={status}
        supported={Boolean(supportedByJahia)}
        reviewed={Boolean(reviewedByJahia)}
        author={forgeAuthor(currentNode)}
        categories={forgeCategoryNames(currentNode)}
        supportedLabel={t("card.supported")}
        reviewedLabel={t("card.reviewed")}
      />
    );
  },
);
