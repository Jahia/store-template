import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { VersionCard } from "~/components/forge/VersionCard";
import { bool, str } from "~/components/forge/nodeProps";
import { versionDownloadUrl } from "~/components/forge/versions";

const VersionView = (_props: object, { currentNode }: { currentNode: JCRNodeWrapper }) => (
  <VersionCard
    versionNumber={str(currentNode, "versionNumber") || currentNode.getName()}
    published={bool(currentNode, "published")}
    changeLogHtml={str(currentNode, "changeLog")}
    downloadUrl={versionDownloadUrl(currentNode)}
  />
);

/** `default` view for a module/package version, used inside the detail page. */
jahiaComponent(
  { nodeType: "jnt:forgeModuleVersion", name: "default", displayName: "Version", componentType: "view" },
  VersionView,
);
jahiaComponent(
  { nodeType: "jnt:forgePackageVersion", name: "default", displayName: "Version", componentType: "view" },
  VersionView,
);
