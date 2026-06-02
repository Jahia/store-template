import { jahiaComponent, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { VersionCard } from "~/components/forge/VersionCard";
import { bool, str, jcrWorkspace } from "~/components/forge/nodeProps";
import { sanitizeHtml } from "~/components/forge/sanitizeHtml";
import { versionDownloadUrl } from "~/components/forge/versions";

const VersionView = (_props: object, { currentNode }: { currentNode: JCRNodeWrapper }) => {
  const { t } = useTranslation();
  const { currentResource } = useServerContext();

  // Owner-island labels built server-side from t() and passed in as props (the
  // client islands never import react-i18next - they survive hydration).
  const VERSION_PUBLISH_LABELS = {
    publish: t("publish.version.publish"),
    unpublish: t("publish.version.unpublish"),
    publishing: t("publish.publishing"),
    publishedState: t("publish.publishedState"),
    draftState: t("publish.draftState"),
    error: t("publish.version.error"),
  };

  const VERSION_CHANGELOG_LABELS = {
    edit: t("version.changelog.edit"),
    save: t("version.changelog.save"),
    saving: t("version.changelog.saving"),
    cancel: t("version.changelog.cancel"),
    saved: t("version.changelog.saved"),
    error: t("version.changelog.error"),
    ariaLabel: t("version.changelog.ariaLabel"),
    loading: t("version.changelog.loading"),
  };

  const VERSION_DELETE_LABELS = {
    remove: t("version.delete.remove"),
    confirmPrompt: t("version.delete.confirmPrompt"),
    confirm: t("version.delete.confirm"),
    cancel: t("version.delete.cancel"),
    deleting: t("version.delete.deleting"),
    error: t("version.delete.error"),
  };

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
      changeLogHtml={sanitizeHtml(str(currentNode, "changeLog"))}
      downloadUrl={versionDownloadUrl(currentNode)}
      downloadLabel={t("version.download")}
      draftLabel={t("version.draft")}
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
