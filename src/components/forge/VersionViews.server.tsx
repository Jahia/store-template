import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { VersionCard } from "~/components/forge/VersionCard";
import { bool, str, jcrWorkspace } from "~/components/forge/nodeProps";
import { versionDownloadUrl } from "~/components/forge/versions";

const VERSION_PUBLISH_LABELS = {
  publish: "Publish version",
  unpublish: "Unpublish version",
  publishing: "Saving…",
  publishedState: "Published",
  draftState: "Draft",
  error: "Could not change the published state.",
};

const VersionView = (_props: object, { currentNode }: { currentNode: JCRNodeWrapper }) => {
  // Owners get a publish/unpublish control on each version; everyone else just
  // sees the published/draft state. The control mutates the same workspace the
  // page is rendered in (live content is authored directly in LIVE).
  const canEdit = currentNode.hasPermission("jcr:write");
  return (
    <VersionCard
      versionNumber={str(currentNode, "versionNumber") || currentNode.getName()}
      published={bool(currentNode, "published")}
      changeLogHtml={str(currentNode, "changeLog")}
      downloadUrl={versionDownloadUrl(currentNode)}
      publishControl={
        canEdit
          ? {
              path: currentNode.getPath(),
              workspace: jcrWorkspace(currentNode),
              labels: VERSION_PUBLISH_LABELS,
            }
          : null
      }
    />
  );
};

/** `default` view for a module/package version, used inside the detail page. */
jahiaComponent(
  { nodeType: "jnt:forgeModuleVersion", name: "default", displayName: "Version", componentType: "view" },
  VersionView,
);
jahiaComponent(
  { nodeType: "jnt:forgePackageVersion", name: "default", displayName: "Version", componentType: "view" },
  VersionView,
);
