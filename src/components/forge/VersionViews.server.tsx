import { jahiaComponent, useServerContext } from "@jahia/javascript-modules-library";
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

const VERSION_CHANGELOG_LABELS = {
  edit: "Edit changelog",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  saved: "Saved",
  error: "Save failed - check your permissions and try again.",
  ariaLabel: "Changelog",
};

const VERSION_DELETE_LABELS = {
  remove: "Remove version",
  confirmPrompt: "Delete this version?",
  confirm: "Delete",
  cancel: "Cancel",
  deleting: "Deleting…",
  error: "Could not remove the version - check your permissions and try again.",
};

const VersionView = (_props: object, { currentNode }: { currentNode: JCRNodeWrapper }) => {
  const { currentResource } = useServerContext();
  // Owners get publish + changelog controls on each version; everyone else sees
  // the published/draft state and read-only changelog. The controls mutate the
  // same workspace the page is rendered in (live content is authored in LIVE).
  const canEdit = currentNode.hasPermission("jcr:write");
  const workspace = jcrWorkspace(currentNode);
  const language = currentResource.getLocale().getLanguage();
  return (
    <VersionCard
      versionNumber={str(currentNode, "versionNumber") || currentNode.getName()}
      published={bool(currentNode, "published")}
      changeLogHtml={str(currentNode, "changeLog")}
      downloadUrl={versionDownloadUrl(currentNode)}
      publishControl={
        canEdit
          ? { path: currentNode.getPath(), workspace, labels: VERSION_PUBLISH_LABELS }
          : null
      }
      changelogControl={
        canEdit
          ? { path: currentNode.getPath(), workspace, language, labels: VERSION_CHANGELOG_LABELS }
          : null
      }
      deleteControl={
        canEdit ? { path: currentNode.getPath(), workspace, labels: VERSION_DELETE_LABELS } : null
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
