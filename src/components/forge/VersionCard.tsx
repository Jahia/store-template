import { Island } from "@jahia/javascript-modules-library";
import styles from "./detail.module.css";
import PublishToggle from "./PublishToggle.client";
import VersionChangelogEditor, { type ChangelogLabels } from "./VersionChangelogEditor.client";
import VersionDeleteButton, { type VersionDeleteLabels } from "./VersionDeleteButton.client";

interface PublishLabels {
  publish: string;
  unpublish: string;
  publishing: string;
  publishedState: string;
  draftState: string;
  error: string;
}

/** Owner-only publish control for this version (omitted for non-owners). */
interface VersionPublishControl {
  path: string;
  workspace: "EDIT" | "LIVE";
  labels: PublishLabels;
}

/** Owner-only changelog editor for this version (omitted for non-owners). */
interface VersionChangelogControl {
  path: string;
  workspace: "EDIT" | "LIVE";
  language: string;
  labels: ChangelogLabels;
}

/** Owner-only delete control for this version (omitted for non-owners). */
interface VersionDeleteControl {
  path: string;
  workspace: "EDIT" | "LIVE";
  labels: VersionDeleteLabels;
}

export interface VersionCardProps {
  versionNumber: string;
  published: boolean;
  changeLogHtml: string;
  downloadUrl: string | null;
  /** Translated "Download" link label (computed server-side). */
  downloadLabel: string;
  /** Translated "draft" badge label, shown to non-owners on unpublished versions. */
  draftLabel: string;
  /** Jahia version this release requires (e.g. "8.1.6.2"), or "" to omit. */
  requiresJahia: string;
  /** Translated "Requires Jahia" label. */
  requiresJahiaLabel: string;
  /** Release date as "YYYY-MM-DD", or "" to omit. */
  updated: string;
  /** Translated "Updated" label. */
  updatedLabel: string;
  publishControl?: VersionPublishControl | null;
  changelogControl?: VersionChangelogControl | null;
  deleteControl?: VersionDeleteControl | null;
}

/** Presentational card for one module/package version (changelog is sanitized richtext). */
export function VersionCard({
  versionNumber,
  published,
  changeLogHtml,
  downloadUrl,
  downloadLabel,
  draftLabel,
  requiresJahia,
  requiresJahiaLabel,
  updated,
  updatedLabel,
  publishControl,
  changelogControl,
  deleteControl,
}: Readonly<VersionCardProps>): JSX.Element {
  return (
    <div className={styles.version} data-forge-version="">
      <div className={styles.versionHead}>
        <span className={styles.versionNumber}>{versionNumber}</span>
        {publishControl ? (
          <Island
            component={PublishToggle}
            props={{
              path: publishControl.path,
              published,
              workspace: publishControl.workspace,
              scope: "version",
              labels: publishControl.labels,
            }}
          />
        ) : (
          !published && <span className={styles.draft}>{draftLabel}</span>
        )}
        {downloadUrl && (
          <a className={styles.download} href={downloadUrl}>
            {downloadLabel}
          </a>
        )}
        {deleteControl && (
          <Island
            component={VersionDeleteButton}
            props={{
              path: deleteControl.path,
              workspace: deleteControl.workspace,
              versionNumber,
              labels: deleteControl.labels,
            }}
          />
        )}
      </div>
      {changeLogHtml && (
        <div className={styles.changelog} dangerouslySetInnerHTML={{ __html: changeLogHtml }} />
      )}
      {changelogControl && (
        <Island
          component={VersionChangelogEditor}
          props={{
            path: changelogControl.path,
            workspace: changelogControl.workspace,
            language: changelogControl.language,
            value: changeLogHtml,
            labels: changelogControl.labels,
          }}
        />
      )}
      {(requiresJahia || updated) && (
        <footer className={styles.versionFooter}>
          {requiresJahia && (
            <span>
              <strong>{requiresJahiaLabel}</strong> {requiresJahia}
            </span>
          )}
          {updated && (
            <span>
              <strong>{updatedLabel}</strong> {updated}
            </span>
          )}
        </footer>
      )}
    </div>
  );
}
