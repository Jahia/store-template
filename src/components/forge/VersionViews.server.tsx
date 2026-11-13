import { jahiaComponent, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { VersionCard } from "~/components/forge/VersionCard";
import { bool, str, strValues, jcrWorkspace, releaseDay } from "~/components/forge/nodeProps";
import { isSeverity, SECURITY_SEVERITIES, type VersionSecurity } from "~/components/forge/versionSecurity";
import { sanitizeHtml } from "~/components/forge/sanitizeHtml";
import { requiredJahiaVersion, versionDownloadUrl } from "~/components/forge/versions";

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

  const SEVERITY_LABELS = Object.fromEntries(
    SECURITY_SEVERITIES.map((severity) => [severity, t(`version.security.severities.${severity}`)]),
  );
  const SECURITY_BADGE_LABELS = {
    badge: t("version.security.badge"),
    source: t("version.security.source"),
    severity: t("version.security.severity"),
    severities: SEVERITY_LABELS,
  };
  const SECURITY_EDITOR_LABELS = {
    edit: t("version.security.edit"),
    legend: t("version.security.legend"),
    flag: t("version.security.flag"),
    severity: t("version.security.severity"),
    severityNone: t("version.security.severityNone"),
    severities: SEVERITY_LABELS,
    references: t("version.security.references"),
    referencesHelp: t("version.security.referencesHelp"),
    referencesInvalid: t("version.security.referencesInvalid"),
    note: t("version.security.note"),
    save: t("version.changelog.save"),
    saving: t("version.changelog.saving"),
    cancel: t("version.changelog.cancel"),
    error: t("version.security.error"),
  };

  // Owners get publish + changelog controls on each version; everyone else sees
  // the published/draft state and read-only changelog. The controls mutate the
  // same workspace the page is rendered in (live content is authored in LIVE).
  const canEdit = currentNode.hasPermission("jcr:write");
  const workspace = jcrWorkspace(currentNode);
  const language = currentResource.getLocale().getLanguage();
  // Module versions only: packages carry no security properties.
  const isModuleVersion = currentNode.isNodeType("jnt:forgeModuleVersion");
  const severity = str(currentNode, "securitySeverity");
  const security: VersionSecurity = {
    flagged: isModuleVersion && bool(currentNode, "securityFix"),
    severity: isSeverity(severity) ? severity : "",
    references: strValues(currentNode, "securityReferences"),
    note: str(currentNode, "securityNote"),
  };
  return (
    <VersionCard
      versionNumber={str(currentNode, "versionNumber") || currentNode.getName()}
      published={bool(currentNode, "published")}
      changeLogHtml={sanitizeHtml(str(currentNode, "changeLog"))}
      downloadUrl={versionDownloadUrl(currentNode)}
      downloadLabel={t("version.download")}
      draftLabel={t("version.draft")}
      requiresJahia={requiredJahiaVersion(currentNode)}
      requiresJahiaLabel={t("detail.meta.requiresJahia")}
      released={releaseDay(currentNode)}
      releasedLabel={t("detail.meta.released")}
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
      security={security}
      securityLabels={SECURITY_BADGE_LABELS}
      securityControl={
        canEdit && isModuleVersion
          ? { path: currentNode.getPath(), workspace, labels: SECURITY_EDITOR_LABELS }
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
